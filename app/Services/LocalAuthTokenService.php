<?php

namespace App\Services;

use App\Models\User;
use Throwable;

class LocalAuthTokenService
{
    public function findUserByEmail(string $email): ?User
    {
        $email = strtolower(trim($email));
        if ($email === '') {
            return null;
        }

        try {
            return User::whereRaw('LOWER(email) = ?', [$email])->first();
        } catch (Throwable $e) {
            return null;
        }
    }

    public function findUserById(int $userId): ?User
    {
        if ($userId <= 0) {
            return null;
        }

        try {
            return User::find($userId);
        } catch (Throwable $e) {
            return null;
        }
    }

    private function appKey(): string
    {
        $key = (string) config('app.key', '');

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);
            if ($decoded !== false && $decoded !== '') {
                return $decoded;
            }
        }

        return $key;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string|false
    {
        $decoded = strtr($value, '-_', '+/');
        $padding = strlen($decoded) % 4;
        if ($padding > 0) {
            $decoded .= str_repeat('=', 4 - $padding);
        }

        return base64_decode($decoded, true);
    }

    private function sign(string $payload): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $payload, $this->appKey(), true));
    }

    private function encode(array $payload): string
    {
        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT',
        ]));

        $body = $this->base64UrlEncode(json_encode($payload));

        return $header . '.' . $body . '.' . $this->sign($header . '.' . $body);
    }

    public function issueAccessToken(User $user, int $ttlMinutes = 10080): string
    {
        $now = time();

        return $this->encode([
            'sub' => (string) $user->id,
            'email' => strtolower(trim((string) $user->email)),
            'name' => (string) $user->name,
            'role' => (string) ($user->role ?? 'customer'),
            'ver' => (int) ($user->auth_token_version ?? 0),
            'typ' => 'access',
            'iat' => $now,
            'exp' => $now + ($ttlMinutes * 60),
        ]);
    }

    public function issueResetToken(User $user, int $ttlMinutes = 60): string
    {
        $now = time();

        return $this->encode([
            'sub' => (string) $user->id,
            'email' => strtolower(trim((string) $user->email)),
            'typ' => 'reset',
            'iat' => $now,
            'exp' => $now + ($ttlMinutes * 60),
        ]);
    }

    public function parse(string $token, string $expectedType = 'access'): ?array
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;
        $expectedSignature = $this->sign($header . '.' . $payload);
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $decodedPayload = $this->base64UrlDecode($payload);
        if ($decodedPayload === false) {
            return null;
        }

        $claims = json_decode($decodedPayload, true);
        if (!is_array($claims)) {
            return null;
        }

        if (($claims['typ'] ?? null) !== $expectedType) {
            return null;
        }

        $expiresAt = (int) ($claims['exp'] ?? 0);
        if ($expiresAt > 0 && $expiresAt < time()) {
            return null;
        }

        return $claims;
    }

    public function resolveUserFromToken(string $token): ?User
    {
        $claims = $this->parse($token, 'access');
        if (!$claims) {
            return null;
        }

        $email = strtolower(trim((string) ($claims['email'] ?? '')));
        $userId = (int) ($claims['sub'] ?? 0);

        $user = null;
        if ($email !== '') {
            $user = $this->findUserByEmail($email);
        }

        if (!$user && $userId > 0) {
            $user = $this->findUserById($userId);
        }

        if (!$user || !$user->is_active || !$user->hasVerifiedEmail()) {
            return null;
        }

        if ((int) ($claims['ver'] ?? 0) !== (int) ($user->auth_token_version ?? 0)) {
            return null;
        }

        return $user;
    }

    public function resolveResetClaims(string $token): ?array
    {
        return $this->parse($token, 'reset');
    }
}
