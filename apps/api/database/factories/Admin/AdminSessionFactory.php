<?php

namespace Database\Factories\Admin;

use App\Models\Admin\AdminSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminSession>
 */
class AdminSessionFactory extends Factory
{
    protected $model = AdminSession::class;

    public function definition(): array
    {
        $firstSeen = $this->faker->dateTimeBetween('-30 days', '-1 hour');

        return [
            'user_id'                 => User::factory(),
            'token_id'                => null,
            'ip_address'              => $this->faker->ipv4(),
            'user_agent'              => $this->faker->userAgent(),
            'device_label'            => null,
            'device_fingerprint_hash' => null,
            'country'                 => null,
            'city'                    => null,
            'first_seen_at'           => $firstSeen,
            'last_seen_at'            => $this->faker->dateTimeBetween($firstSeen, 'now'),
            'revoked_at'              => null,
        ];
    }
}
