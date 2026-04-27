<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Enums\VisitorRequestStatus;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoVisitorDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Compound exists
        $compound = Compound::firstOrCreate(
            ['code' => 'PH'],
            [
                'id' => (string) Str::ulid(),
                'name' => 'Premium Heights',
                'timezone' => 'Africa/Cairo',
                'status' => 'active',
            ]
        );

        // 2. Ensure Building exists
        $building = Building::firstOrCreate(
            ['compound_id' => $compound->id, 'code' => 'A1'],
            [
                'id' => (string) Str::ulid(),
                'name' => 'Building A1',
            ]
        );

        // 3. Ensure Unit exists
        $unit = Unit::firstOrCreate(
            ['building_id' => $building->id, 'unit_number' => '101'],
            [
                'id' => (string) Str::ulid(),
                'compound_id' => $compound->id,
                'type' => 'apartment',
                'area_sqm' => 180,
                'bedrooms' => 3,
                'status' => 'active',
            ]
        );

        // 4. Identify all Resident users
        $residents = User::whereIn('role', [
            UserRole::ResidentOwner->value,
            UserRole::ResidentTenant->value,
        ])->get();

        foreach ($residents as $resident) {
            // 5. Link Resident to Unit
            UnitMembership::firstOrCreate(
                ['user_id' => $resident->id, 'unit_id' => $unit->id],
                [
                    'relation_type' => 'owner',
                    'verification_status' => VerificationStatus::Verified->value,
                    'starts_at' => now()->subMonths(6),
                    'is_primary' => true,
                ]
            );

            // 6. Add some demo Visitor Requests for EACH resident
            $this->seedVisitors($resident, $unit);
        }
    }

    private function seedVisitors(User $host, Unit $unit): void
    {
        $visitors = [
            [
                'visitor_name' => 'Ahmed Mohamed',
                'visitor_phone' => '+201111111111',
                'vehicle_plate' => 'ABC 123',
                'status' => VisitorRequestStatus::Pending->value,
                'visit_starts_at' => now()->addHours(2),
                'visit_ends_at' => now()->addHours(26),
                'number_of_visitors' => 1,
                'notes' => 'Coming for dinner',
            ],
            [
                'visitor_name' => 'Sarah Jenkins',
                'visitor_phone' => '+201222222222',
                'status' => VisitorRequestStatus::QrIssued->value,
                'visit_starts_at' => now()->subHours(1),
                'visit_ends_at' => now()->addHours(23),
                'number_of_visitors' => 2,
                'notes' => 'Meeting at the lobby',
            ],
        ];

        foreach ($visitors as $v) {
            VisitorRequest::updateOrCreate(
                [
                    'host_user_id' => $host->id, 
                    'visitor_name' => $v['visitor_name'], 
                    'unit_id' => $unit->id
                ],
                array_merge($v, [
                    'visit_starts_at' => $v['visit_starts_at'],
                    'visit_ends_at' => $v['visit_ends_at'],
                ])
            );
        }
    }
}
