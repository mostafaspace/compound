<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\ContactVisibility;
use App\Enums\RepresentativeRole;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
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
        $this->seedUnitMemberships($units);
        $this->seedChargeTypes();
        $this->seedUnitAccounts($units);
        $this->seedOrgChart($compound, $building, $floor);
    }

    // ─── Compound / property ──────────────────────────────────────────────────

    private function seedCompound(): Compound
    {
        $this->call(NextPointSeeder::class);

        return Compound::query()->where('code', 'NEXT-POINT')->firstOrFail();
    }

    private function seedBuilding(Compound $compound): Building
    {
        return Building::query()
            ->where('compound_id', $compound->id)
            ->where('code', 'A')
            ->firstOrFail();
    }

    private function seedFloor(Building $building): Floor
    {
        return Floor::query()
            ->where('building_id', $building->id)
            ->where('level_number', 1)
            ->firstOrFail();
    }

    /**
     * @return Unit[]
     */
    private function seedUnits(Building $building, Floor $floor): array
    {
        $units = [];

        foreach (['AR-F1-F1', 'AR-F1-F2', 'AR-F1-F3', 'AR-F1-F4'] as $number) {
            $units[$number] = Unit::query()
                ->where('building_id', $building->id)
                ->where('floor_id', $floor->id)
                ->where('unit_number', $number)
                ->firstOrFail();
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
                'email'       => 'president@uat.compound.local',
                'name'        => 'UAT President',
                'phone'       => '+201100000009',
                'role'        => UserRole::President->value,
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
                'email'       => 'resident@uat.compound.local',
                'name'        => 'UAT Resident',
                'phone'       => '+201100000010',
                'role'        => UserRole::Resident->value,
                'compound_id' => $compound->id,
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

    /**
     * @param  array<string, Unit>  $units
     */
    private function seedUnitMemberships(array $units): void
    {
        $admin = User::query()->where('email', 'compound-admin@uat.compound.local')->first();

        $assignments = [
            'resident@uat.compound.local' => ['unit' => 'AR-F1-F1', 'relation' => UnitRelationType::Resident],
            'resident-owner@uat.compound.local' => ['unit' => 'AR-F1-F2', 'relation' => UnitRelationType::Owner],
            'resident-tenant@uat.compound.local' => ['unit' => 'AR-F1-F3', 'relation' => UnitRelationType::Tenant],
        ];

        foreach ($assignments as $email => $assignment) {
            $user = User::query()->where('email', $email)->first();
            $unit = $units[$assignment['unit']] ?? null;

            if (! $user || ! $unit) {
                continue;
            }

            $unit->memberships()->updateOrCreate([
                'user_id' => $user->id,
            ], [
                'relation_type' => $assignment['relation']->value,
                'starts_at' => now()->toDateString(),
                'is_primary' => true,
                'verification_status' => VerificationStatus::Verified->value,
                'created_by' => $admin?->id,
            ]);
        }
    }

    // ─── Org chart demo data ──────────────────────────────────────────────────

    private function seedOrgChart(Compound $compound, Building $buildingA, Floor $groundFloor): void
    {
        $password = Hash::make(self::PASSWORD);

        RepresentativeAssignment::query()
            ->whereIn('user_id', User::query()->where('email', 'like', '%@uat.compound.local')->select('id'))
            ->delete();

        // ── Extra buildings ───────────────────────────────────────────────────
        $buildingB = Building::query()->where('compound_id', $compound->id)->where('code', 'B')->firstOrFail();

        // ── Extra floors ──────────────────────────────────────────────────────
        $floorB1 = Floor::query()->where('building_id', $buildingB->id)->where('level_number', 1)->firstOrFail();
        $floorB2 = Floor::query()->where('building_id', $buildingB->id)->where('level_number', 2)->firstOrFail();

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

        $admin = User::query()->where('email', 'compound-admin@uat.compound.local')->first();
        $orgMemberships = [
            'ahmed.hassan@uat.compound.local' => Unit::query()->where('building_id', $buildingA->id)->where('unit_number', 'AR-F2-F1')->first(),
            'sara.mohamed@uat.compound.local' => Unit::query()->where('building_id', $buildingB->id)->where('unit_number', 'BR-F2-F1')->first(),
            'omar.khalil@uat.compound.local' => Unit::query()->where('building_id', $buildingA->id)->where('unit_number', 'AR-F1-F4')->first(),
            'nour.eldin@uat.compound.local' => Unit::query()->where('building_id', $buildingB->id)->where('unit_number', 'BR-F1-F1')->first(),
            'fatima.ibrahim@uat.compound.local' => Unit::query()->where('building_id', $buildingB->id)->where('unit_number', 'BR-F2-F2')->first(),
        ];

        foreach ($orgMemberships as $email => $unit) {
            if (! $unit) {
                continue;
            }

            $unit->memberships()->updateOrCreate([
                'user_id' => $users[$email]->id,
            ], [
                'relation_type' => UnitRelationType::Owner->value,
                'starts_at' => now()->toDateString(),
                'is_primary' => true,
                'verification_status' => VerificationStatus::Verified->value,
                'created_by' => $admin?->id,
            ]);
        }

        // Reuse existing UAT personas for leadership roles
        $president = User::query()->where('email', 'president@uat.compound.local')->first();
        $boardMember    = User::query()->where('email', 'board-member@uat.compound.local')->first();
        $financeReviewer = User::query()->where('email', 'finance-reviewer@uat.compound.local')->first();

        // ── Representative assignments ─────────────────────────────────────────
        $assignments = [];

        if ($president) {
            $assignments[] = [
                'compound_id'        => $compound->id,
                'building_id'        => null,
                'floor_id'           => null,
                'user_id'            => $president->id,
                'role'               => RepresentativeRole::President->value,
                'contact_visibility' => ContactVisibility::AllResidents->value,
            ];
        }

        if ($boardMember) {
            $assignments[] = [
                'compound_id'        => $compound->id,
                'building_id'        => null,
                'floor_id'           => null,
                'user_id'            => $boardMember->id,
                'role'               => RepresentativeRole::AssociationMember->value,
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
            'floor_id'           => $floorB1->id,
            'user_id'            => $users['nour.eldin@uat.compound.local']->id,
            'role'               => RepresentativeRole::FloorRepresentative->value,
            'contact_visibility' => ContactVisibility::FloorResidents->value,
        ];
        $assignments[] = [
            'compound_id'        => $compound->id,
            'building_id'        => $buildingB->id,
            'floor_id'           => $floorB2->id,
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
