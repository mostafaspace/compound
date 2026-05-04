<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\ContactVisibility;
use App\Enums\RepresentativeRole;
use App\Enums\UserRole;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * UAT Seeder (CM-127)
 *
 * Creates one persona account per role, a demo compound, two buildings,
 * floors, units, and a linked unit account — giving QA testers a
 * complete environment for executing UAT scenarios.
 *
 * All accounts use password: "uat-password-2026"
 * All emails end in @uat.compound.local for easy identification.
 *
 * Safe to re-run: uses firstOrCreate throughout.
 */
class UatSeeder extends Seeder
{
    private const PASSWORD = 'uat-password-2026';

    public function run(): void
    {
        $compound  = $this->seedCompound();
        $building  = $this->seedBuilding($compound);
        $floor     = $this->seedFloor($building);
        $units     = $this->seedUnits($building, $floor);
        $this->seedPersonas($compound, $units);
        $this->seedChargeTypes();
        $this->seedUnitAccounts($units);
        $this->seedOrgChart($compound, $building, $floor);
    }

    // ─── Compound / property ──────────────────────────────────────────────────

    private function seedCompound(): Compound
    {
        return Compound::query()->firstOrCreate(
            ['name' => 'UAT Demo Compound'],
            [
                'legal_name' => 'UAT Demo Compound LLC',
                'code'       => 'UAT-DEMO',
                'timezone'   => 'Africa/Cairo',
                'currency'   => 'EGP',
                'status'     => 'active',
            ],
        );
    }

    private function seedBuilding(Compound $compound): Building
    {
        return Building::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'name' => 'Building A'],
            ['code' => 'BLD-A'],
        );
    }

    private function seedFloor(Building $building): Floor
    {
        return Floor::query()->firstOrCreate(
            ['building_id' => $building->id, 'level_number' => 1],
            ['label' => 'Ground Floor'],
        );
    }

    /**
     * @return Unit[]
     */
    private function seedUnits(Building $building, Floor $floor): array
    {
        $units = [];
        foreach (['101', '102', '103'] as $number) {
            $units[$number] = Unit::query()->firstOrCreate(
                ['building_id' => $building->id, 'unit_number' => $number],
                [
                    'compound_id' => $building->compound_id,
                    'floor_id'    => $floor->id,
                    'type'        => 'apartment',
                    'area_sqm'    => 120.0,
                    'status'      => 'active',
                ],
            );
        }

        return $units;
    }

    // ─── Persona accounts ──────────────────────────────────────────────────────

    /**
     * @param  array<string, Unit>  $units
     */
    private function seedPersonas(Compound $compound, array $units): void
    {
        $password = Hash::make(self::PASSWORD);

        $personas = [
            [
                'email'       => 'super-admin@uat.compound.local',
                'name'        => 'UAT Super Admin',
                'phone'       => '+201100000001',
                'role'        => UserRole::SuperAdmin->value,
                'compound_id' => null,
            ],
            [
                'email'       => 'compound-admin@uat.compound.local',
                'name'        => 'UAT Compound Admin',
                'phone'       => '+201100000002',
                'role'        => UserRole::CompoundAdmin->value,
                'compound_id' => $compound->id,
            ],
            [
                'email'       => 'board-member@uat.compound.local',
                'name'        => 'UAT Board Member',
                'phone'       => '+201100000003',
                'role'        => UserRole::BoardMember->value,
                'compound_id' => $compound->id,
            ],
            [
                'email'       => 'finance-reviewer@uat.compound.local',
                'name'        => 'UAT Finance Reviewer',
                'phone'       => '+201100000004',
                'role'        => UserRole::FinanceReviewer->value,
                'compound_id' => $compound->id,
            ],
            [
                'email'       => 'security-guard@uat.compound.local',
                'name'        => 'UAT Security Guard',
                'phone'       => '+201100000005',
                'role'        => UserRole::SecurityGuard->value,
                'compound_id' => $compound->id,
            ],
            [
                'email'       => 'support-agent@uat.compound.local',
                'name'        => 'UAT Support Agent',
                'phone'       => '+201100000006',
                'role'        => UserRole::SupportAgent->value,
                'compound_id' => null,
            ],
            [
                'email'       => 'resident-owner@uat.compound.local',
                'name'        => 'UAT Resident Owner',
                'phone'       => '+201100000007',
                'role'        => UserRole::ResidentOwner->value,
                'compound_id' => $compound->id,
            ],
            [
                'email'       => 'resident-tenant@uat.compound.local',
                'name'        => 'UAT Resident Tenant',
                'phone'       => '+201100000008',
                'role'        => UserRole::ResidentTenant->value,
                'compound_id' => $compound->id,
            ],
        ];

        foreach ($personas as $attrs) {
            User::query()->updateOrCreate(
                ['email' => $attrs['email']],
                array_merge($attrs, [
                    'status'   => AccountStatus::Active->value,
                    'password' => $password,
                ]),
            );
        }
    }

    // ─── Org chart demo data ──────────────────────────────────────────────────

    private function seedOrgChart(Compound $compound, Building $buildingA, Floor $groundFloor): void
    {
        $password = Hash::make(self::PASSWORD);

        // ── Extra buildings ───────────────────────────────────────────────────
        $buildingB = Building::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'name' => 'Building B'],
            ['code' => 'BLD-B'],
        );
        $buildingC = Building::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'name' => 'Building C'],
            ['code' => 'BLD-C'],
        );

        // ── Extra floors ──────────────────────────────────────────────────────
        $floorA1 = Floor::query()->firstOrCreate(
            ['building_id' => $buildingA->id, 'level_number' => 2],
            ['label' => 'Floor 1'],
        );

        $floorB0 = Floor::query()->firstOrCreate(
            ['building_id' => $buildingB->id, 'level_number' => 1],
            ['label' => 'Ground Floor'],
        );
        $floorB1 = Floor::query()->firstOrCreate(
            ['building_id' => $buildingB->id, 'level_number' => 2],
            ['label' => 'Floor 1'],
        );

        $floorC0 = Floor::query()->firstOrCreate(
            ['building_id' => $buildingC->id, 'level_number' => 1],
            ['label' => 'Ground Floor'],
        );

        // ── Org chart users ───────────────────────────────────────────────────
        $orgUsers = [
            'ahmed.hassan@uat.compound.local'   => ['name' => 'Ahmed Hassan',   'phone' => '+201100000020'],
            'sara.mohamed@uat.compound.local'    => ['name' => 'Sara Mohamed',   'phone' => '+201100000021'],
            'omar.khalil@uat.compound.local'     => ['name' => 'Omar Khalil',    'phone' => '+201100000022'],
            'nour.eldin@uat.compound.local'      => ['name' => 'Nour El-Din',    'phone' => '+201100000023'],
            'fatima.ibrahim@uat.compound.local'  => ['name' => 'Fatima Ibrahim', 'phone' => '+201100000024'],
        ];

        $users = [];
        foreach ($orgUsers as $email => $attrs) {
            $users[$email] = User::query()->updateOrCreate(
                ['email' => $email],
                array_merge($attrs, [
                    'role'        => UserRole::ResidentOwner->value,
                    'compound_id' => $compound->id,
                    'status'      => AccountStatus::Active->value,
                    'password'    => $password,
                ]),
            );
        }

        // Reuse existing UAT personas for leadership roles
        $boardMember    = User::query()->where('email', 'board-member@uat.compound.local')->first();
        $financeReviewer = User::query()->where('email', 'finance-reviewer@uat.compound.local')->first();

        // ── Representative assignments ─────────────────────────────────────────
        $assignments = [];

        if ($boardMember) {
            $assignments[] = [
                'compound_id'        => $compound->id,
                'building_id'        => null,
                'floor_id'           => null,
                'user_id'            => $boardMember->id,
                'role'               => RepresentativeRole::President->value,
                'contact_visibility' => ContactVisibility::AllResidents->value,
            ];
        }

        if ($financeReviewer) {
            $assignments[] = [
                'compound_id'        => $compound->id,
                'building_id'        => null,
                'floor_id'           => null,
                'user_id'            => $financeReviewer->id,
                'role'               => RepresentativeRole::Treasurer->value,
                'contact_visibility' => ContactVisibility::AllResidents->value,
            ];
        }

        // Building representatives
        $assignments[] = [
            'compound_id'        => $compound->id,
            'building_id'        => $buildingA->id,
            'floor_id'           => null,
            'user_id'            => $users['ahmed.hassan@uat.compound.local']->id,
            'role'               => RepresentativeRole::BuildingRepresentative->value,
            'contact_visibility' => ContactVisibility::BuildingResidents->value,
        ];
        $assignments[] = [
            'compound_id'        => $compound->id,
            'building_id'        => $buildingB->id,
            'floor_id'           => null,
            'user_id'            => $users['sara.mohamed@uat.compound.local']->id,
            'role'               => RepresentativeRole::BuildingRepresentative->value,
            'contact_visibility' => ContactVisibility::BuildingResidents->value,
        ];

        // Floor representatives
        $assignments[] = [
            'compound_id'        => $compound->id,
            'building_id'        => $buildingA->id,
            'floor_id'           => $groundFloor->id,
            'user_id'            => $users['omar.khalil@uat.compound.local']->id,
            'role'               => RepresentativeRole::FloorRepresentative->value,
            'contact_visibility' => ContactVisibility::FloorResidents->value,
        ];
        $assignments[] = [
            'compound_id'        => $compound->id,
            'building_id'        => $buildingB->id,
            'floor_id'           => $floorB0->id,
            'user_id'            => $users['nour.eldin@uat.compound.local']->id,
            'role'               => RepresentativeRole::FloorRepresentative->value,
            'contact_visibility' => ContactVisibility::FloorResidents->value,
        ];
        $assignments[] = [
            'compound_id'        => $compound->id,
            'building_id'        => $buildingB->id,
            'floor_id'           => $floorB1->id,
            'user_id'            => $users['fatima.ibrahim@uat.compound.local']->id,
            'role'               => RepresentativeRole::FloorRepresentative->value,
            'contact_visibility' => ContactVisibility::FloorResidents->value,
        ];

        foreach ($assignments as $attrs) {
            RepresentativeAssignment::query()->firstOrCreate(
                [
                    'compound_id' => $attrs['compound_id'],
                    'building_id' => $attrs['building_id'],
                    'floor_id'    => $attrs['floor_id'],
                    'user_id'     => $attrs['user_id'],
                    'role'        => $attrs['role'],
                ],
                array_merge($attrs, [
                    'starts_at' => now()->startOfYear()->toDateString(),
                    'is_active' => true,
                ]),
            );
        }
    }

    // ─── Finance baseline ──────────────────────────────────────────────────────

    private function seedChargeTypes(): void
    {
        // Ensure the baseline charge types exist (safe to call multiple times)
        $this->call(BaselineSeeder::class);
    }

    /**
     * @param  array<string, Unit>  $units
     */
    private function seedUnitAccounts(array $units): void
    {
        foreach ($units as $unit) {
            UnitAccount::query()->firstOrCreate(
                ['unit_id' => $unit->id],
                [
                    'balance'  => 0.0,
                    'currency' => 'EGP',
                ],
            );
        }
    }
}
