<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
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
        $compound = $this->seedCompound();
        $building = $this->seedBuilding($compound);
        $floor    = $this->seedFloor($building);
        $units    = $this->seedUnits($building, $floor);
        $this->seedPersonas($compound, $units);
        $this->seedChargeTypes();
        $this->seedUnitAccounts($units);
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
            User::query()->firstOrCreate(
                ['email' => $attrs['email']],
                array_merge($attrs, [
                    'status'   => AccountStatus::Active->value,
                    'password' => $password,
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
