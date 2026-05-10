<?php

namespace Database\Factories\Admin;

use App\Models\Admin\AdminSecurityFlag;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminSecurityFlag>
 */
class AdminSecurityFlagFactory extends Factory
{
    protected $model = AdminSecurityFlag::class;

    public function definition(): array
    {
        $types = ['new_device', 'new_ip', 'too_many_ips', 'high_risk_action', 'failed_login_spike'];
        $type  = $this->faker->randomElement($types);

        return [
            'user_id'          => User::factory(),
            'admin_session_id' => null,
            'type'             => $type,
            'severity'         => $this->faker->randomElement(['info', 'warning', 'critical']),
            'status'           => 'open',
            'summary'          => ucfirst($type).' detected for admin user.',
            'metadata'         => null,
            'reviewed_by'      => null,
            'reviewed_at'      => null,
        ];
    }
}
