<?php

namespace Database\Seeders;

use App\Models\Finance\ChargeType;
use Illuminate\Database\Seeder;

/**
 * Seed baseline configuration data that all compounds depend on.
 * Uses firstOrCreate so it is safe to re-run at any time.
 */
class BaselineSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedChargeTypes();
    }

    private function seedChargeTypes(): void
    {
        $types = [
            [
                'code' => 'monthly_service',
                'name' => 'Monthly Service Charge',
                'default_amount' => null,
                'is_recurring' => true,
            ],
            [
                'code' => 'annual_subscription',
                'name' => 'Annual Subscription',
                'default_amount' => null,
                'is_recurring' => true,
            ],
            [
                'code' => 'maintenance_fee',
                'name' => 'Maintenance Fee',
                'default_amount' => null,
                'is_recurring' => false,
            ],
            [
                'code' => 'parking_fee',
                'name' => 'Parking Fee',
                'default_amount' => null,
                'is_recurring' => true,
            ],
            [
                'code' => 'late_payment_penalty',
                'name' => 'Late Payment Penalty',
                'default_amount' => null,
                'is_recurring' => false,
            ],
            [
                'code' => 'club_membership',
                'name' => 'Club Membership',
                'default_amount' => null,
                'is_recurring' => true,
            ],
            [
                'code' => 'utility_recovery',
                'name' => 'Utility Recovery',
                'default_amount' => null,
                'is_recurring' => false,
            ],
            [
                'code' => 'sinking_fund',
                'name' => 'Sinking Fund Contribution',
                'default_amount' => null,
                'is_recurring' => true,
            ],
            [
                'code' => 'one_time_charge',
                'name' => 'One-Time Charge',
                'default_amount' => null,
                'is_recurring' => false,
            ],
        ];

        foreach ($types as $type) {
            ChargeType::query()->firstOrCreate(
                ['code' => $type['code']],
                $type,
            );
        }
    }
}
