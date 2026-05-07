<?php

namespace Database\Seeders;

use App\Enums\UnitRelationType;
use App\Enums\UnitType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;

class NextPointSeeder extends Seeder
{
    public function run(): void
    {
        $compound = Compound::query()->updateOrCreate([
            'code' => 'NEXT-POINT',
        ], [
            'name' => 'Next Point',
            'legal_name' => 'Next Point Compound Owners Association',
            'timezone' => 'Africa/Cairo',
            'currency' => 'EGP',
            'status' => 'active',
            'metadata' => [
                'location' => 'Mokattam - Cairo',
                'address' => 'Behind Shooting Club - Middle Plateau - Maadi Ring Road',
                'developer' => 'Next Home Development',
                'project_kind' => ['residential', 'commercial', 'administrative'],
                'residential_units' => 3000,
                'resident_capacity' => 11000,
                'green_area_sqm' => 12000,
                'area_range_sqm' => ['min' => 96, 'max' => 324],
                'payment_plan' => ['down_payment_from_percent' => 30, 'installments_up_to_months' => 72],
                'website' => 'https://nexthome-egy.com',
                'logo_url' => 'https://nexthome-egy.com/media/1986/logo-02.png',
                'phone' => '19699',
                'seed_note' => 'Representative UAT fixture based on public Next Home pages; not a complete 3000-unit inventory.',
            ],
        ]);

        $admin = User::where('email', 'admin@compound.local')->first();
        $resident = User::where('email', 'resident@compound.local')->first();

        // ── Building definitions ─────────────────────────────────────────────
        // A-L = residential/commercial blocks; C/D is a distinct shared building label in Next Point.
        $buildingDefs = [
            'A' => ['label' => 'Building A', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1699/a.jpg'],
            'B' => ['label' => 'Building B', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1700/b.jpg'],
            'C' => ['label' => 'Building C', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1701/c.jpg'],
            'D' => ['label' => 'Building D', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1702/d.jpg'],
            'C/D' => ['label' => 'Building C/D', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1702/d.jpg'],
            'E' => ['label' => 'Building E', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1703/e.jpg'],
            'F' => ['label' => 'Building F', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1704/f.jpg'],
            'G' => ['label' => 'Building G', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1705/g.jpg'],
            'H' => ['label' => 'Building H', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1706/h04-1.jpg'],
            'I' => ['label' => 'Building I', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1707/i.jpg'],
            'J' => ['label' => 'Building J', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1708/j.jpg'],
            'K' => ['label' => 'Building K', 'type' => 'commercial', 'image' => 'https://nexthome-egy.com/media/1709/k.jpg'],
            'L' => ['label' => 'Building L', 'type' => 'residential', 'image' => 'https://nexthome-egy.com/media/1710/l.jpg'],
        ];

        $firstUnit = null;
        $sortIndex = 0;

        foreach ($buildingDefs as $code => $def) {
            $building = Building::query()->updateOrCreate([
                'compound_id' => $compound->id,
                'code' => $code,
            ], [
                'name' => $def['label'],
                'sort_order' => $sortIndex++,
                'metadata' => [
                    'type' => $def['type'],
                    'image_url' => $def['image'],
                ],
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
            ApartmentResident::query()->updateOrCreate([
                'unit_id' => $firstUnit->id,
                'user_id' => $resident->id,
            ], [
                'relation_type' => UnitRelationType::Owner->value,
                'starts_at' => now()->toDateString(),
                'is_primary' => true,
                'verification_status' => VerificationStatus::Verified->value,
                'created_by' => $admin->id,
            ]);
        }
    }

    // ── Building H — real unit data from nexthome-egy.com ───────────────────
    private function seedBuildingH(Compound $compound, Building $building, ?Unit $firstUnit): ?Unit
    {
        // Unit data per floor: [floor_level => [[unit_number, type, area, bedrooms], ...]]
        $floorUnits = [
            1 => [
                ['HR-F1-F1', UnitType::Apartment, 155.0, 3],
                ['HR-F1-F2', UnitType::Apartment, 120.0, 2],
                ['HR-F1-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F1-F4', UnitType::Studio,    75.0,  1],
            ],
            2 => [
                ['HR-F2-F1', UnitType::Apartment, 162.0, 3],
                ['HR-F2-F2', UnitType::Apartment, 130.0, 2],
                ['HR-F2-F3', UnitType::Apartment, 140.0, 3],
                ['HR-F2-F4', UnitType::Studio,    80.0,  1],
            ],
            3 => [
                ['HR-F3-F1', UnitType::Apartment, 160.0, 3],
                ['HR-F3-F2', UnitType::Apartment, 125.0, 2],
                ['HR-F3-F3', UnitType::Apartment, 150.0, 3],
                ['HR-F3-F4', UnitType::Studio,    76.0,  1],
            ],
            4 => [
                ['HR-F4-F1', UnitType::Apartment, 158.0, 3],
                ['HR-F4-F2', UnitType::Apartment, 128.0, 2],
                ['HR-F4-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F4-F4', UnitType::Studio,    78.0,  1],
            ],
            5 => [
                ['HR-F5-F1', UnitType::Apartment, 180.0, 3],
                ['HR-F5-F2', UnitType::Apartment, 130.0, 2],
                ['HR-F5-F3', UnitType::Apartment, 148.0, 3],
                ['HR-F5-F4', UnitType::Studio,    77.0,  1],
            ],
            6 => [
                ['HR-F6-F1', UnitType::Apartment, 155.0, 3],
                ['HR-F6-F2', UnitType::Apartment, 120.0, 2],
                ['HR-F6-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F6-F4', UnitType::Studio,    76.0,  1],
            ],
            7 => [
                ['HR-F7-F1', UnitType::Apartment, 100.0, 2],
                ['HR-F7-F2', UnitType::Apartment, 155.0, 3],
                ['HR-F7-F3', UnitType::Apartment, 140.0, 3],
                ['HR-F7-F4', UnitType::Studio,    79.0,  1],
            ],
            8 => [
                ['HR-F8-F1', UnitType::Apartment, 198.0, 3],
                ['HR-F8-F2', UnitType::Apartment, 105.0, 2],
                ['HR-F8-F3', UnitType::Apartment, 145.0, 3],
                ['HR-F8-F4', UnitType::Studio,    77.0,  1],
            ],
            9 => [
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
            $floor = Floor::query()->updateOrCreate([
                'building_id' => $building->id,
                'level_number' => $level,
            ], [
                'label' => "Floor {$level}",
                'sort_order' => $level,
            ]);

            foreach ($units as [$unitNumber, $type, $area, $beds]) {
                $unit = Unit::query()->updateOrCreate([
                    'compound_id' => $compound->id,
                    'building_id' => $building->id,
                    'unit_number' => $unitNumber,
                ], [
                    'floor_id' => $floor->id,
                    'type' => $type->value,
                    'area_sqm' => $area,
                    'bedrooms' => $beds,
                    'status' => 'active',
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
            $floor = Floor::query()->updateOrCreate([
                'building_id' => $building->id,
                'level_number' => $level,
            ], [
                'label' => $label,
                'sort_order' => $level,
            ]);

            foreach ($units as [$unitNumber, $type, $area, $beds]) {
                Unit::query()->updateOrCreate([
                    'compound_id' => $compound->id,
                    'building_id' => $building->id,
                    'unit_number' => $unitNumber,
                ], [
                    'floor_id' => $floor->id,
                    'type' => $type->value,
                    'area_sqm' => $area,
                    'bedrooms' => $beds,
                    'status' => 'active',
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
            $floor = Floor::query()->updateOrCreate([
                'building_id' => $building->id,
                'level_number' => $level,
            ], [
                'label' => $label,
                'sort_order' => $level,
            ]);

            $levelCode = $level === 0 ? 'F0' : "F{$level}";
            $unitPrefix = str_replace('/', '', $code);

            foreach ($unitMix as $flat => [$type, $area, $beds]) {
                $flatNum = $flat + 1;
                $typeCode = $type === UnitType::Studio ? 'R' : 'R';
                $unitNumber = "{$unitPrefix}{$typeCode}-{$levelCode}-F{$flatNum}";

                Unit::query()->updateOrCreate([
                    'compound_id' => $compound->id,
                    'building_id' => $building->id,
                    'unit_number' => $unitNumber,
                ], [
                    'floor_id' => $floor->id,
                    'type' => $type->value,
                    'area_sqm' => $area,
                    'bedrooms' => $beds,
                    'status' => 'active',
                ]);
            }
        }
    }
}
