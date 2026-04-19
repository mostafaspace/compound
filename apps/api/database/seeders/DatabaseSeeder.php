<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'Compound Admin',
            'email' => 'admin@compound.local',
            'phone' => '+201000000001',
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $resident = User::factory()->create([
            'name' => 'Demo Resident',
            'email' => 'resident@compound.local',
            'phone' => '+201000000002',
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        $compound = Compound::factory()->create([
            'name' => 'Nile Gardens',
            'legal_name' => 'Nile Gardens Owners Association',
            'code' => 'NILE-GARDENS',
        ]);

        $buildings = collect(['A', 'B', 'C'])->map(function (string $code, int $index) use ($compound): Building {
            return Building::factory()->for($compound)->create([
                'name' => 'Building '.$code,
                'code' => $code,
                'sort_order' => $index + 1,
            ]);
        });

        $firstUnit = null;

        $buildings->each(function (Building $building) use (&$firstUnit, $compound): void {
            foreach (range(0, 5) as $level) {
                $floor = Floor::factory()->for($building)->create([
                    'label' => $level === 0 ? 'Ground' : 'Floor '.$level,
                    'level_number' => $level,
                    'sort_order' => $level,
                ]);

                foreach (range(1, 4) as $number) {
                    $unit = Unit::factory()->for($compound)->for($building)->for($floor)->create([
                        'unit_number' => sprintf('%d%02d', $level, $number),
                    ]);

                    $firstUnit ??= $unit;
                }
            }
        });

        if ($firstUnit instanceof Unit) {
            UnitMembership::query()->create([
                'unit_id' => $firstUnit->id,
                'user_id' => $resident->id,
                'relation_type' => UnitRelationType::Owner->value,
                'starts_at' => now()->toDateString(),
                'is_primary' => true,
                'verification_status' => VerificationStatus::Verified->value,
                'created_by' => $admin->id,
            ]);
        }
    }
}
