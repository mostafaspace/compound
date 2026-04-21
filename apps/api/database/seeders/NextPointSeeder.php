<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UnitRelationType;
use App\Enums\UnitType;
use App\Enums\VerificationStatus;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NextPointSeeder extends Seeder
{
    public function run(): void
    {
        // Clear all compound-related data first
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        UnitMembership::query()->delete();
        Unit::query()->delete();
        Floor::query()->delete();
        Building::query()->delete();
        Compound::query()->delete();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $compound = Compound::query()->create([
            'name'      => 'Next Point',
            'legal_name'=> 'Next Point Compound Owners Association',
            'code'      => 'NEXT-POINT',
            'timezone'  => 'Africa/Cairo',
            'currency'  => 'EGP',
            'status'    => 'active',
            'metadata'  => [
                'location'    => 'New Cairo, 5th Settlement',
                'developer'   => 'Next Home Development',
                'total_units' => 600,
                'website'     => 'https://nexthome-egy.com',
                'phone'       => '19699',
            ],
        ]);

        $admin    = User::where('email', 'admin@compound.local')->first();
        $resident = User::where('email', 'resident@compound.local')->first();

        // ── Building definitions ─────────────────────────────────────────────
        // A-J = residential, K = commercial, L = residential
        $buildingDefs = [
            'A' => ['label' => 'Building A', 'type' => 'residential'],
            'B' => ['label' => 'Building B', 'type' => 'residential'],
            'C' => ['label' => 'Building C', 'type' => 'residential'],
            'D' => ['label' => 'Building D', 'type' => 'residential'],
            'E' => ['label' => 'Building E', 'type' => 'residential'],
            'F' => ['label' => 'Building F', 'type' => 'residential'],
            'G' => ['label' => 'Building G', 'type' => 'residential'],
            'H' => ['label' => 'Building H', 'type' => 'residential'],
            'I' => ['label' => 'Building I', 'type' => 'residential'],
            'J' => ['label' => 'Building J', 'type' => 'residential'],
            'K' => ['label' => 'Building K', 'type' => 'commercial'],
            'L' => ['label' => 'Building L', 'type' => 'residential'],
        ];

        $firstUnit = null;
        $sortIndex = 0;

        foreach ($buildingDefs as $code => $def) {
            $building = Building::query()->create([
                'compound_id' => $compound->id,
                'name'        => $def['label'],
                'code'        => $code,
                'sort_order'  => $sortIndex++,
                'metadata'    => ['type' => $def['type']],
            ]);

            if ($def['type'] === 'commercial') {
                $this->seedBuildingK($compound, $building);
            } elseif ($code === 'H') {
                $firstUnit = $this->seedBuildingH($compound, $building, $firstUnit);
            } else {
                $this->seedStandardResidential($compound, $building, $code);
            }
        }

        // ── Assign demo resident to first unit in Building H ────────────────
        if ($firstUnit instanceof Unit && $resident && $admin) {
            UnitMembership::query()->create([
                'unit_id'             => $firstUnit->id,
                'user_id'             => $resident->id,
                'relation_type'       => UnitRelationType::Owner->value,
                'starts_at'           => now()->toDateString(),
                'is_primary'          => true,
                'verification_status' => VerificationStatus::Verified->value,
                'created_by'          => $admin->id,
            ]);
        }
    }

    // ── Building H — real unit data from nexthome-egy.com ───────────────────
    private function seedBuildingH(Compound $compound, Building $building, ?Unit $firstUnit): ?Unit
    {
        // Unit data per floor: [floor_level => [[unit_number, type, area, bedrooms], ...]]
        $floorUnits = [
            1  => [
                ['HR-F1-F1', UnitType::Apartment, 155.0, 3],
                ['HR-F1-F2', UnitType::Apartment, 120.0, 2],
                ['HR-F1-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F1-F4', UnitType::Studio,    75.0,  1],
            ],
            2  => [
                ['HR-F2-F1', UnitType::Apartment, 162.0, 3],
                ['HR-F2-F2', UnitType::Apartment, 130.0, 2],
                ['HR-F2-F3', UnitType::Apartment, 140.0, 3],
                ['HR-F2-F4', UnitType::Studio,    80.0,  1],
            ],
            3  => [
                ['HR-F3-F1', UnitType::Apartment, 160.0, 3],
                ['HR-F3-F2', UnitType::Apartment, 125.0, 2],
                ['HR-F3-F3', UnitType::Apartment, 150.0, 3],
                ['HR-F3-F4', UnitType::Studio,    76.0,  1],
            ],
            4  => [
                ['HR-F4-F1', UnitType::Apartment, 158.0, 3],
                ['HR-F4-F2', UnitType::Apartment, 128.0, 2],
                ['HR-F4-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F4-F4', UnitType::Studio,    78.0,  1],
            ],
            5  => [
                ['HR-F5-F1', UnitType::Apartment, 180.0, 3],
                ['HR-F5-F2', UnitType::Apartment, 130.0, 2],
                ['HR-F5-F3', UnitType::Apartment, 148.0, 3],
                ['HR-F5-F4', UnitType::Studio,    77.0,  1],
            ],
            6  => [
                ['HR-F6-F1', UnitType::Apartment, 155.0, 3],
                ['HR-F6-F2', UnitType::Apartment, 120.0, 2],
                ['HR-F6-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F6-F4', UnitType::Studio,    76.0,  1],
            ],
            7  => [
                ['HR-F7-F1', UnitType::Apartment, 100.0, 2],
                ['HR-F7-F2', UnitType::Apartment, 155.0, 3],
                ['HR-F7-F3', UnitType::Apartment, 140.0, 3],
                ['HR-F7-F4', UnitType::Studio,    79.0,  1],
            ],
            8  => [
                ['HR-F8-F1', UnitType::Apartment, 198.0, 3],
                ['HR-F8-F2', UnitType::Apartment, 105.0, 2],
                ['HR-F8-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F8-F4', UnitType::Studio,    77.0,  1],
            ],
            9  => [
                ['HR-F9-F1', UnitType::Apartment, 167.0, 3],
                ['HR-F9-F2', UnitType::Apartment, 120.0, 2],
                ['HR-F9-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F9-F4', UnitType::Studio,    78.0,  1],
            ],
            10 => [
                ['HR-F10-F1', UnitType::Apartment, 164.0, 3],
                ['HR-F10-F2', UnitType::Studio,     77.0, 1],
                ['HR-F10-F3', UnitType::Apartment,  110.0, 2],
                ['HR-F10-F4', UnitType::Apartment,  148.0, 3],
            ],
            11 => [
                ['HR-F11-F1', UnitType::Apartment, 118.0, 2],
                ['HR-F11-F2', UnitType::Studio,    109.0, 1],
                ['HR-F11-F3', UnitType::Apartment, 155.0, 3],
                ['HR-F11-F4', UnitType::Apartment, 140.0, 3],
            ],
        ];

        foreach ($floorUnits as $level => $units) {
            $floor = Floor::query()->create([
                'building_id'  => $building->id,
                'label'        => "Floor {$level}",
                'level_number' => $level,
                'sort_order'   => $level,
            ]);

            foreach ($units as [$unitNumber, $type, $area, $beds]) {
                $unit = Unit::query()->create([
                    'compound_id' => $compound->id,
                    'building_id' => $building->id,
                    'floor_id'    => $floor->id,
                    'unit_number' => $unitNumber,
                    'type'        => $type->value,
                    'area_sqm'    => $area,
                    'bedrooms'    => $beds,
                    'status'      => 'active',
                ]);

                $firstUnit ??= $unit;
            }
        }

        return $firstUnit;
    }

    // ── Building K — commercial offices ─────────────────────────────────────
    private function seedBuildingK(Compound $compound, Building $building): void
    {
        $floors = [
            0 => ['Ground', [
                ['KR-F0-S1', UnitType::Retail, 55.0,  null],
                ['KR-F0-S2', UnitType::Retail, 62.0,  null],
                ['KR-F0-S3', UnitType::Retail, 48.0,  null],
            ]],
            1 => ['Floor 1', [
                ['KO-F1-O1', UnitType::Office, 95.0,  null],
                ['KO-F1-O2', UnitType::Office, 110.0, null],
                ['KO-F1-O3', UnitType::Office, 88.0,  null],
            ]],
            2 => ['Floor 2', [
                ['KO-F2-O1', UnitType::Office, 132.0, null], // C.W.B2 from website
                ['KO-F2-O2', UnitType::Office,  88.0, null], // T.B.B2 from website
                ['KO-F2-O3', UnitType::Office, 105.0, null],
            ]],
        ];

        foreach ($floors as $level => [$label, $units]) {
            $floor = Floor::query()->create([
                'building_id'  => $building->id,
                'label'        => $label,
                'level_number' => $level,
                'sort_order'   => $level,
            ]);

            foreach ($units as [$unitNumber, $type, $area, $beds]) {
                Unit::query()->create([
                    'compound_id' => $compound->id,
                    'building_id' => $building->id,
                    'floor_id'    => $floor->id,
                    'unit_number' => $unitNumber,
                    'type'        => $type->value,
                    'area_sqm'    => $area,
                    'bedrooms'    => $beds,
                    'status'      => 'active',
                ]);
            }
        }
    }

    // ── Standard residential building (A-G, I, J, L) ────────────────────────
    // Ground + 11 floors, 4 units per floor
    private function seedStandardResidential(Compound $compound, Building $building, string $code): void
    {
        // Apartment mix per floor: [area, beds, type]
        $unitMix = [
            [UnitType::Apartment, 155.0, 3],
            [UnitType::Apartment, 120.0, 2],
            [UnitType::Apartment, 140.0, 3],
            [UnitType::Studio,     75.0, 1],
        ];

        for ($level = 0; $level <= 11; $level++) {
            $label = $level === 0 ? 'Ground' : "Floor {$level}";
            $floor = Floor::query()->create([
                'building_id'  => $building->id,
                'label'        => $label,
                'level_number' => $level,
                'sort_order'   => $level,
            ]);

            $levelCode = $level === 0 ? 'F0' : "F{$level}";

            foreach ($unitMix as $flat => [$type, $area, $beds]) {
                $flatNum = $flat + 1;
                $typeCode = $type === UnitType::Studio ? 'R' : 'R';
                $unitNumber = "{$code}{$typeCode}-{$levelCode}-F{$flatNum}";

                Unit::query()->create([
                    'compound_id' => $compound->id,
                    'building_id' => $building->id,
                    'floor_id'    => $floor->id,
                    'unit_number' => $unitNumber,
                    'type'        => $type->value,
                    'area_sqm'    => $area,
                    'bedrooms'    => $beds,
                    'status'      => 'active',
                ]);
            }
        }
    }
}
