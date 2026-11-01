<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\LocalAuthTokenService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_requires_email_verification_before_sign_in(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'Jordan',
            'last_name' => 'Santos',
            'email' => 'jordan.santos@example.test',
            'password' => 'secure-password',
            'password_confirmation' => 'secure-password',
            'region_code' => '1800000000',
        ]);

        $response->assertCreated()
            ->assertJsonPath('requires_email_verification', true)
            ->assertJsonPath('verification_email_sent', true)
            ->assertJsonMissingPath('token');

        $user = User::where('email', 'jordan.santos@example.test')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertSame('1800000000', $user->region_code);
        Notification::assertSentTo($user, VerifyEmail::class);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'secure-password',
        ])->assertForbidden()->assertJsonPath('requires_email_verification', true);
    }

    public function test_signed_verification_link_marks_the_account_verified(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(30),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification())]
        );

        $this->get($url)->assertRedirect('/login?verified=1');

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_logout_revokes_the_previous_access_token(): void
    {
        $user = User::factory()->create();
        $token = app(LocalAuthTokenService::class)->issueAccessToken($user);

        $this->postJson('/api/auth/logout', [], ['Authorization' => 'Bearer ' . $token])
            ->assertOk();

        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer ' . $token])
            ->assertUnauthorized();
    }

    public function test_changing_email_requires_new_verification_and_revokes_old_access_tokens(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $token = app(LocalAuthTokenService::class)->issueAccessToken($user);

        $this->putJson('/api/auth/profile', [
            'email' => 'new.address@example.test',
        ], ['Authorization' => 'Bearer ' . $token])
            ->assertOk()
            ->assertJsonPath('requires_email_verification', true)
            ->assertJsonPath('verification_email_sent', true);

        $updatedUser = $user->fresh();
        $this->assertNull($updatedUser->email_verified_at);
        $this->assertSame(1, (int) $updatedUser->auth_token_version);
        Notification::assertSentTo($updatedUser, VerifyEmail::class);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer ' . $token])
            ->assertUnauthorized();
    }
}
