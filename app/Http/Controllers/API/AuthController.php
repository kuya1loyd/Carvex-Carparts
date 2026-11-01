<?php
namespace App\Http\Controllers\API;

use Laravel\Socialite\Facades\Socialite;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LocalAuthTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;


class AuthController extends Controller
{
    private function googleOAuthConfigurationError(): ?string
    {
        if (blank(config('services.google.client_id')) || blank(config('services.google.client_secret'))) {
            return 'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to valid Google OAuth credentials.';
        }

        return null;
    }

    private function googleCallbackUrl(Request $request): string
    {
        $configured = trim((string) config('services.google.redirect', ''));
        if ($configured !== '' && filter_var($configured, FILTER_VALIDATE_URL)) {
            return $configured;
        }

        // Must match Google Console redirect URI
        return rtrim($request->getSchemeAndHttpHost(), '/') . '/auth/callback/google';
    }

    private function frontendCallbackBase(Request $request): string
    {
        return rtrim($request->getSchemeAndHttpHost(), '/') . '/auth/callback';
    }

    private function resolveFrontendRedirectUrl(Request $request): string
    {
        $default = $this->frontendCallbackBase($request);
        $raw = trim((string) $request->input('redirect_to', ''));
        if ($raw === '') {
            return $default;
        }

        if (str_starts_with($raw, '/')) {
            return rtrim($request->getSchemeAndHttpHost(), '/') . $raw;
        }

        $candidate = parse_url($raw);
        $base = parse_url($default);
        if (!$candidate || !isset($candidate['scheme'], $candidate['host']) || !$base || !isset($base['host'])) {
            return $default;
        }

        $candidateScheme = strtolower((string) $candidate['scheme']);
        $baseScheme = strtolower((string) ($base['scheme'] ?? ''));
        $candidatePort = (int) ($candidate['port'] ?? ($candidateScheme === 'https' ? 443 : 80));
        $basePort = (int) ($base['port'] ?? ($baseScheme === 'https' ? 443 : 80));

        // Keep OAuth tokens on the same origin, including its protocol and port.
        if (!in_array($candidateScheme, ['http', 'https'], true)
            || $candidateScheme !== $baseScheme
            || $candidatePort !== $basePort
            || strtolower((string) $candidate['host']) !== strtolower((string) $base['host'])) {
            return $default;
        }

        return $raw;
    }

    private function appendQueryParam(string $url, string $key, string $value): string
    {
        $separator = str_contains($url, '?') ? '&' : '?';
        return $url . $separator . urlencode($key) . '=' . urlencode($value);
    }

    private function appendFragmentParam(string $url, string $key, string $value): string
    {
        $parts = parse_url($url);
        $fragment = isset($parts['fragment']) ? (string) $parts['fragment'] : '';
        $fragment = ltrim($fragment, '#');
        $separator = $fragment === '' ? '' : '&';
        $fragment .= $separator . urlencode($key) . '=' . urlencode($value);

        $base = preg_replace('/#.*$/', '', $url);
        return $base . '#' . $fragment;
    }

    private function makeVerificationUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );
    }

    private function sendVerificationEmail(User $user): bool
    {
        try {
            $user->sendEmailVerificationNotification();
            $url = $this->makeVerificationUrl($user);
            Log::info("Verification link generated for user {$user->id} ({$user->email}): {$url}");
            return true;
        } catch (Throwable $exception) {
            Log::warning('Account verification email could not be sent.', [
                'user_id' => $user->id,
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    // Google OAuth: Redirect to Google
    public function redirectToGoogle(Request $request)
    {
        if ($configurationError = $this->googleOAuthConfigurationError()) {
            return response()->json(['message' => $configurationError], 503);
        }

        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $redirectTo = $this->resolveFrontendRedirectUrl($request);
        $request->session()->put('auth.oauth_redirect_to', $redirectTo);

        $driver = Socialite::driver('google');
        return $driver
            ->redirectUrl($this->googleCallbackUrl($request))
            ->redirect();
    }

    // Google OAuth: Handle callback
    public function handleGoogleCallback(Request $request)
    {
        $redirectTo = (string) $request->session()->pull(
            'auth.oauth_redirect_to',
            $this->frontendCallbackBase($request)
        );

        if ($configurationError = $this->googleOAuthConfigurationError()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $configurationError], 503);
            }

            return redirect()->away($this->appendQueryParam($redirectTo, 'error', 'google_not_configured'));
        }

        try {
            /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
            $driver = Socialite::driver('google');
            $googleUser = $driver
                ->redirectUrl($this->googleCallbackUrl($request))
                ->user();
            $googleEmail = strtolower(trim((string) $googleUser->getEmail()));
            $googleAttributes = $googleUser->getRaw();
            $emailVerified = filter_var(
                $googleAttributes['email_verified'] ?? $googleAttributes['verified_email'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            if ($googleEmail === '' || !$emailVerified) {
                throw new \RuntimeException('Google did not return a verified email address.');
            }

            $user = $this->tokenService()->findUserByEmail($googleEmail);
            if (!$user) {
                // Create a new user if not exists
                $user = User::create([
                    'name' => $googleUser->getName() ?? $googleUser->getNickname() ?? 'Google User',
                    'email' => $googleEmail,
                    'password' => Hash::make(Str::random(16)),
                    'role' => $this->isAdminEmail($googleEmail) ? 'admin' : 'customer',
                    'is_active' => true,
                ]);
                $user->forceFill(['email_verified_at' => now()])->save();
            } elseif (!$user->is_active) {
                return response()->json(['message' => 'This account is inactive.'], 403);
            } elseif (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            if ($this->isAdminEmail($googleEmail) && $user->role !== 'admin') {
                $user->forceFill(['role' => 'admin'])->save();
            }

            // Always download and save Google profile picture (for both new and existing users)
            $avatarUrl = $googleUser->getAvatar();
            if ($avatarUrl) {
                try {
                    $imageContents = file_get_contents($avatarUrl);
                    if ($imageContents) {
                        $fileName = $user->id . '.jpg';
                        Storage::disk('public')->put('avatars/' . $fileName, $imageContents);
                    }
                } catch (\Exception $e) {
                    // Silently fail if avatar download fails
                }
            }
            // Issue token (or session) and return user info
            $token = $this->tokenService()->issueAccessToken($user);

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Google login successful',
                    'user' => $this->userPayload($user),
                    'customer_info' => $this->customerInfo($user),
                    'token' => $token,
                    'refresh_token' => null,
                ]);
            }

            return redirect()->away($this->appendFragmentParam($redirectTo, 'token', $token));
        } catch (\Exception $e) {
            // Get error message or use exception type if empty
            $errorMessage = $e->getMessage() ?: get_class($e);
            $fullError = $errorMessage . ' in ' . $e->getFile() . ':' . $e->getLine();
            
            // Log the actual error for debugging
            Log::error('Google OAuth failed: ' . $fullError);

            if (!$request->expectsJson()) {
                $errorRedirect = $this->appendQueryParam($redirectTo, 'error', 'google_auth_failed');
                return redirect()->away($errorRedirect);
            }

            return response()->json([
                'message' => 'Google authentication could not be completed. Check the server OAuth configuration and try again.',
            ], 500);
        }
    }
    // Local token auth controller for MySQL-backed users.
    private function tokenService(): LocalAuthTokenService
    {
        return app(LocalAuthTokenService::class);
    }

    private function adminEmails(): array
    {
        return array_values(array_filter(array_map(
            static fn ($value) => strtolower(trim((string) $value)),
            explode(',', (string) env('ADMIN_EMAILS', 'carvexcarparts@gmail.com,admincarvex@gmaail.com,admincarvex@gmail.com'))
        )));
    }

    private function isAdminEmail(string $email): bool
    {
        return in_array(strtolower(trim($email)), $this->adminEmails(), true);
    }

    private function avatarPathForUserId(int $userId): ?string
    {
        $prefix = (string) $userId . '.';
        foreach (Storage::disk('public')->files('avatars') as $path) {
            if (str_starts_with((string) basename($path), $prefix)) {
                return $path;
            }
        }

        return null;
    }

    private function avatarUrlForUser(User $user): ?string
    {
        $path = $this->avatarPathForUserId((int) $user->id);
        if (!$path) {
            return null;
        }

        $version = (string) Storage::disk('public')->lastModified($path);

        return url('/storage/' . $path) . '?v=' . $version;
    }

    private function customerInfo(User $user): array
    {
        return [
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'billing_address' => $user->billing_address ?? $user->address,
            'shipping_address' => $user->shipping_address ?? $user->address,
            'payment_method' => $user->payment_method,
            'city' => $user->city,
            'state' => $user->region,
            'region' => $user->region,
            'region_code' => $user->region_code,
            'province' => $user->province,
            'barangay' => $user->barangay,
            'postal_code' => $user->postal_code,
            'avatar_url' => $this->avatarUrlForUser($user),
            'role' => $user->role,
            'is_active' => (bool) $user->is_active,
        ];
    }

    private function userPayload(User $user): array
    {
        $payload = $user->toArray();
        $payload['avatar_url'] = $this->avatarUrlForUser($user);

        return $payload;
    }

    public function oauthUrl(Request $request, string $provider)
    {
        $provider = strtolower(trim($provider));
        if ($provider !== 'google') {
            return response()->json([
                'message' => ucfirst($provider) . ' signup is not supported.',
                'provider' => $provider,
            ], 422);
        }

        if ($configurationError = $this->googleOAuthConfigurationError()) {
            return response()->json(['message' => $configurationError], 503);
        }

        $redirectTo = $this->resolveFrontendRedirectUrl($request);
        $request->session()->put('auth.oauth_redirect_to', $redirectTo);

        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google');
        $authUrl = $driver
            ->redirectUrl($this->googleCallbackUrl($request))
            ->redirect()
            ->getTargetUrl();

        return response()->json([
            'message' => 'OAuth URL generated successfully.',
            'provider' => $provider,
            'url' => $authUrl,
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'billing_address' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'region' => 'nullable|string|max:100',
            'region_code' => 'nullable|string|in:0100000000,0200000000,0300000000,0400000000,1700000000,0500000000,0600000000,0700000000,0800000000,0900000000,1000000000,1100000000,1200000000,1600000000,1300000000,1400000000,1900000000,1800000000',
            'province' => 'nullable|string|max:120',
            'barangay' => 'nullable|string|max:120',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
        ]);

        $firstName = trim((string) ($validated['first_name'] ?? ''));
        $lastName = trim((string) ($validated['last_name'] ?? ''));
        $name = trim((string) ($validated['name'] ?? ''));
        if ($name === '') {
            $name = trim($firstName . ' ' . $lastName);
        }
        if ($name === '') {
            throw ValidationException::withMessages([
                'first_name' => ['Enter your first and last name.'],
            ]);
        }

        $email = strtolower(trim((string) $validated['email']));
        $user = User::create([
            'name' => $name,
            'first_name' => $firstName !== '' ? $firstName : null,
            'last_name' => $lastName !== '' ? $lastName : null,
            'email' => $email,
            'password' => Hash::make((string) $validated['password']),
            'role' => $this->isAdminEmail($email) ? 'admin' : 'customer',
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'billing_address' => $validated['billing_address'] ?? ($validated['address'] ?? null),
            'shipping_address' => $validated['shipping_address'] ?? ($validated['address'] ?? null),
            'payment_method' => $validated['payment_method'] ?? null,
            'city' => $validated['city'] ?? null,
            'region' => $validated['region'] ?? ($validated['state'] ?? null),
            'region_code' => $validated['region_code'] ?? null,
            'province' => $validated['province'] ?? null,
            'barangay' => $validated['barangay'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'is_active' => true,
        ]);

        $emailSent = $this->sendVerificationEmail($user);
        $debugUrl = config('app.debug') ? $this->makeVerificationUrl($user) : null;

        return response()->json([
            'message' => $emailSent
                ? 'Account created. Check your email to verify your address before signing in.'
                : 'Account created, but the verification email could not be sent. Please try again shortly.',
            'requires_email_verification' => true,
            'verification_email_sent' => $emailSent,
            'debug_verification_url' => $debugUrl,
        ], 201);
    }

    public function verifyEmail(Request $request, int $id, string $hash)
    {
        $user = User::findOrFail($id);
        $expectedHash = sha1($user->getEmailForVerification());

        if (!hash_equals($expectedHash, $hash)) {
            abort(403, 'This verification link is invalid.');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        // Issue auth token immediately and redirect to callback for seamless login
        $token = $this->tokenService()->createToken($user);
        return redirect('/auth/callback?token=' . urlencode($token) . '&verified=1');
    }

    public function verificationStatus(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email|max:255',
        ]);

        $user = $this->tokenService()->findUserByEmail(strtolower(trim((string) $validated['email'])));
        return response()->json([
            'verified' => $user ? $user->hasVerifiedEmail() : false,
        ]);
    }

    public function resendVerification(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email|max:255',
            'password' => 'required|string',
        ]);

        $debugUrl = null;
        $user = $this->tokenService()->findUserByEmail((string) $validated['email']);
        if ($user && $user->is_active && !$user->hasVerifiedEmail()
            && Hash::check((string) $validated['password'], (string) $user->password)) {
            $this->sendVerificationEmail($user);
            if (config('app.debug')) {
                $debugUrl = $this->makeVerificationUrl($user);
            }
        }

        return response()->json([
            'message' => 'If those credentials match an active unverified account, a new verification email has been sent.',
            'debug_verification_url' => $debugUrl,
        ]);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim((string) $validated['email']));
        $user = $this->tokenService()->findUserByEmail($email);

        if (!$user || !Hash::check((string) $validated['password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'This account is inactive.',
            ], 403);
        }

        if (!$user->hasVerifiedEmail()) {
            $debugUrl = config('app.debug') ? $this->makeVerificationUrl($user) : null;
            return response()->json([
                'message' => 'Verify your email address before signing in.',
                'requires_email_verification' => true,
                'debug_verification_url' => $debugUrl,
            ], 403);
        }

        if ($this->isAdminEmail($email) && $user->role !== 'admin') {
            $user->forceFill(['role' => 'admin'])->save();
            $user->refresh();
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => $this->userPayload($user),
            'customer_info' => $this->customerInfo($user),
            'token' => $this->tokenService()->issueAccessToken($user),
            'refresh_token' => null,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ]);

        $email = strtolower(trim((string) $validated['email']));
        $user = $this->tokenService()->findUserByEmail($email);
        if (!$user) {
            return response()->json([
                'message' => 'If an account exists, a reset link has been sent.',
            ]);
        }

        $plainToken = Str::random(64);
        DB::table('password_resets')->updateOrInsert(
            ['email' => $email],
            ['token' => Hash::make($plainToken), 'created_at' => now()]
        );

        $redirectTo = trim((string) $request->input('redirect_to', url('/reset-password')));
        $separator = str_contains($redirectTo, '?') ? '&' : '?';
        $resetUrl = $redirectTo . $separator . 'token=' . urlencode($plainToken);

        try {
            $fromAddress = config('mail.from.address', 'carvexcarparts@gmail.com');
            $fromName = config('mail.from.name', 'CarVex');
            $subject = 'Reset Your Password | CarVex Car Parts';
            $userName = $user->name ?? 'Valued Customer';

            $body = <<<TEXT
========================================
            CarVex Car Parts
      Premium Auto Parts Marketplace
========================================

Hi {$userName},

We received a request to reset your password for your CarVex account.

CLICK HERE TO RESET YOUR PASSWORD:
{$resetUrl}

========================================
IMPORTANT SECURITY INFORMATION:
========================================

This link expires in 2 hours.

If you did NOT request a password reset, please ignore this email.

For help, contact us: carvexcarparts@gmail.com

---
CarVex Car Parts
© 2025 All rights reserved.
TEXT;

            Mail::raw($body, static function ($message) use ($email, $fromAddress, $fromName, $subject) {
                $message->to($email)
                        ->from($fromAddress, $fromName)
                        ->subject($subject);
            });

            return response()->json([
                'message' => 'If an account exists, a reset link has been sent.',
                'sent' => true,
            ]);
        } catch (Throwable $e) {
            logger()->warning('Password reset email could not be sent.', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            // Return 200 with reset link so user can still reset password via the link
            return response()->json([
                'message' => 'Email delivery is unavailable. Use the reset link below.',
                'sent' => false,
                'reset_link' => $resetUrl,
            ]);
        }
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $rows = DB::table('password_resets')
            ->where('created_at', '>=', now()->subHours(2))
            ->get();

        $matched = null;
        foreach ($rows as $row) {
            if (Hash::check((string) $validated['token'], (string) $row->token)) {
                $matched = $row;
                break;
            }
        }

        if (!$matched) {
            return response()->json(['message' => 'Invalid or expired reset token.'], 400);
        }

        $user = $this->tokenService()->findUserByEmail(strtolower((string) $matched->email));
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        try {
            $user->forceFill([
                'password' => Hash::make((string) $validated['password']),
                'auth_token_version' => (int) ($user->auth_token_version ?? 0) + 1,
            ])->save();
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Password reset requires database connectivity. Please try again once database access is restored.',
            ], 503);
        }

        DB::table('password_resets')->where('email', $matched->email)->delete();

        return response()->json([
            'message' => 'Password reset successful.',
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->forceFill([
                'auth_token_version' => (int) ($user->auth_token_version ?? 0) + 1,
            ])->save();
        }

        return response()->json([
            'message' => 'Logout successful',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json([
            'message' => 'Profile retrieved successfully',
            'user' => $this->userPayload($user),
            'customer_info' => $this->customerInfo($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:20',
            'address' => 'sometimes|nullable|string|max:255',
            'billing_address' => 'sometimes|nullable|string|max:255',
            'shipping_address' => 'sometimes|nullable|string|max:255',
            'payment_method' => 'sometimes|nullable|string|max:50',
            'city' => 'sometimes|nullable|string|max:100',
            'region' => 'sometimes|nullable|string|max:100',
            'region_code' => 'sometimes|nullable|string|in:0100000000,0200000000,0300000000,0400000000,1700000000,0500000000,0600000000,0700000000,0800000000,0900000000,1000000000,1100000000,1200000000,1600000000,1300000000,1400000000,1900000000,1800000000',
            'province' => 'sometimes|nullable|string|max:120',
            'barangay' => 'sometimes|nullable|string|max:120',
            'state' => 'sometimes|nullable|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:20',
        ]);

        $emailChanged = false;
        if (array_key_exists('email', $validated)) {
            $validated['email'] = strtolower(trim((string) $validated['email']));
            if ($validated['email'] !== strtolower(trim((string) $user->email))) {
                $emailChanged = true;
            }
        }

        if (array_key_exists('state', $validated) && !array_key_exists('region', $validated)) {
            $validated['region'] = $validated['state'];
        }

        unset($validated['state']);
        $user->fill($validated);
        if ($emailChanged) {
            $user->forceFill([
                'email_verified_at' => null,
                'auth_token_version' => (int) ($user->auth_token_version ?? 0) + 1,
            ]);
        }
        $user->save();

        $verificationEmailSent = false;
        if ($emailChanged) {
            $verificationEmailSent = $this->sendVerificationEmail($user);
        }

        return response()->json([
            'message' => $emailChanged
                ? 'Email updated. Verify the new address before signing in again.'
                : 'Profile updated successfully',
            'requires_email_verification' => $emailChanged,
            'verification_email_sent' => $emailChanged ? $verificationEmailSent : null,
            'user' => $this->userPayload($user->fresh()),
            'customer_info' => $this->customerInfo($user->fresh()),
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized. Please log in again.'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string',
            'new_password_confirmation' => 'required|string',
        ]);

        if (!Hash::check((string) $validated['current_password'], (string) $user->password)) {
            return response()->json(['message' => 'Current password is incorrect. Please try again.'], 400);
        }

        if ($validated['new_password'] !== $validated['new_password_confirmation']) {
            return response()->json(['message' => 'New password and confirmation do not match'], 400);
        }

        try {
            $user->forceFill([
                'password' => Hash::make((string) $validated['new_password']),
                'auth_token_version' => (int) ($user->auth_token_version ?? 0) + 1,
            ])->save();

            return response()->json([
                'message' => 'Password changed successfully',
            ]);
        } catch (Throwable $e) {
            Log::error('Password change failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'error' => $e
            ]);
            return response()->json([
                'message' => 'Failed to change password. Please try again.',
            ], 500);
        }
    }

    public function uploadAvatar(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'avatar' => 'required|image|max:4096',
        ]);

        $oldPath = $this->avatarPathForUserId((int) $user->id);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        $extension = $request->file('avatar')->getClientOriginalExtension() ?: 'jpg';
        $fileName = $user->id . '.' . strtolower($extension);
        $path = $request->file('avatar')->storeAs('avatars', $fileName, 'public');

        return response()->json([
            'message' => 'Avatar uploaded successfully',
            'path' => $path,
            'avatar_url' => $this->avatarUrlForUser($user->fresh()),
        ]);
    }
}
