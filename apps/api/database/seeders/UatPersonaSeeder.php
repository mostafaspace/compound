<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Seeds UAT persona accounts for all core roles.
 *
 * Each persona uses a predictable email/password for staging/UAT testing.
 * All accounts are idempotent via firstOrCreate.
 *
 * [Model: Claude] Future models: read this ticket's existing comments before continuing.
 */
class UatPersonaSeeder extends Seeder
{
    use WithoutModelEvents;

    private const PASSWORD = 'password';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create personas linked to the first compound (for compound-scoped roles).
        $compoundId = null;
        if (\App\Models\Property\Compound::exists()) {
            $compoundId = \App\Models\Property\Compound::first()->id;
        }

        $this->command->info('Seeding UAT persona accounts...');

        $personas = $this->getPersonas($compoundId);

        foreach ($personas as $persona) {
            $user = User::updateOrCreate(
                ['email' => $persona['email']],
                $persona
            );

            $this->command->info("  ✓ {$persona['name']} ({$persona['role']})");
        }

        $this->linkResidentsToUnits($compoundId);

        $this->command->info("UAT personas seeded. Password for all accounts: " . self::PASSWORD);
    }

    private function linkResidentsToUnits(?string $compoundId): void
    {
        if (!$compoundId) return;

        $units = Unit::where('compound_id', $compoundId)->limit(2)->get();
        if ($units->count() < 2) return;

        $owner = User::where('email', 'uat-resident-owner@compound.local')->first();
        $tenant = User::where('email', 'uat-resident-tenant@compound.local')->first();

        if ($owner) {
            UnitMembership::updateOrCreate(
                ['unit_id' => $units[0]->id, 'user_id' => $owner->id],
                [
                    'relation_type' => UnitRelationType::Owner->value,
                    'is_primary' => true,
                    'verification_status' => VerificationStatus::Verified->value,
                    'starts_at' => now()->subYear(),
                ]
            );
        }

        if ($tenant) {
            UnitMembership::updateOrCreate(
                ['unit_id' => $units[1]->id, 'user_id' => $tenant->id],
                [
                    'relation_type' => UnitRelationType::Tenant->value,
                    'is_primary' => true,
                    'verification_status' => VerificationStatus::Verified->value,
                    'starts_at' => now()->subMonths(6),
                ]
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getPersonas(?string $compoundId): array
    {
        return [
            // Super Admin — platform-wide access, no compound binding.
            [
                'name'     => 'UAT Super Admin',
                'email'    => 'uat-super-admin@compound.local',
                'phone'    => '+201000000100',
                'role'     => UserRole::SuperAdmin->value,
                'status'   => AccountStatus::Active->value,
                'password' => bcrypt(self::PASSWORD),
            ],

            // Compound Admin — manages the compound operations.
            [
                'name'        => 'UAT Compound Admin',
                'email'       => 'uat-compound-admin@compound.local',
                'phone'       => '+201000000101',
                'role'        => UserRole::CompoundAdmin->value,
                'compound_id' => $compoundId,
                'status'      => AccountStatus::Active->value,
                'password'    => bcrypt(self::PASSWORD),
            ],

            // Board Member — governance and finance read access.
            [
                'name'        => 'UAT Board Member',
                'email'       => 'uat-board-member@compound.local',
                'phone'       => '+201000000102',
                'role'        => UserRole::BoardMember->value,
                'compound_id' => $compoundId,
                'status'      => AccountStatus::Active->value,
                'password'    => bcrypt(self::PASSWORD),
            ],

            // Finance Reviewer — finance operations and approvals.
            [
                'name'        => 'UAT Finance Reviewer',
                'email'       => 'uat-finance-reviewer@compound.local',
                'phone'       => '+201000000103',
                'role'        => UserRole::FinanceReviewer->value,
                'compound_id' => $compoundId,
                'status'      => AccountStatus::Active->value,
                'password'    => bcrypt(self::PASSWORD),
            ],

            // Security Guard — visitor management and security operations.
            [
                'name'        => 'UAT Security Guard',
                'email'       => 'uat-security-guard@compound.local',
                'phone'       => '+201000000104',
                'role'        => UserRole::SecurityGuard->value,
                'compound_id' => $compoundId,
                'status'      => AccountStatus::Active->value,
                'password'    => bcrypt(self::PASSWORD),
            ],

            // Resident Owner — property owner.
            [
                'name'        => 'UAT Resident Owner',
                'email'       => 'uat-resident-owner@compound.local',
                'phone'       => '+201000000105',
                'role'        => UserRole::ResidentOwner->value,
                'compound_id' => $compoundId,
                'status'      => AccountStatus::Active->value,
                'password'    => bcrypt(self::PASSWORD),
            ],

            // Resident Tenant — tenant/shop holder.
            [
                'name'        => 'UAT Resident Tenant',
                'email'       => 'uat-resident-tenant@compound.local',
                'phone'       => '+201000000106',
                'role'        => UserRole::ResidentTenant->value,
                'compound_id' => $compoundId,
                'status'      => AccountStatus::Active->value,
                'password'    => bcrypt(self::PASSWORD),
            ],

            // Support Agent — support console and user management.
            [
                'name'     => 'UAT Support Agent',
                'email'    => 'uat-support-agent@compound.local',
                'phone'    => '+201000000107',
                'role'     => UserRole::SupportAgent->value,
                'status'   => AccountStatus::Active->value,
                'password' => bcrypt(self::PASSWORD),
            ],
        ];
    }
}
