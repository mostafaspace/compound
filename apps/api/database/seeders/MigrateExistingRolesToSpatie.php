<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class MigrateExistingRolesToSpatie extends Seeder
{
    /** Maps UserRole enum value → [spatie_role_name, scope_type] */
    private const ROLE_MAP = [
        'super_admin' => ['super_admin',      'global'],
        'compound_admin' => ['compound_head',    'compound'],
        'board_member' => ['board_member',     'compound'],
        'finance_reviewer' => ['finance_reviewer', 'compound'],
        'security_guard' => ['security_guard',   'compound'],
        'resident_owner' => ['resident_owner',   'unit'],
        'resident_tenant' => ['resident_tenant',  'unit'],
        'support_agent' => ['support_agent',    'global'],
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        User::with(['apartmentResidents'])->chunkById(100, function ($users): void {
            foreach ($users as $user) {
                $legacyRole = $user->role?->value;

                if (! $legacyRole || ! isset(self::ROLE_MAP[$legacyRole])) {
                    continue;
                }

                [$spatieRoleName, $scopeType] = self::ROLE_MAP[$legacyRole];

                // Assign Spatie role
                $role = Role::where('name', $spatieRoleName)->where('guard_name', 'sanctum')->first();
                if ($role && ! $user->hasRole($spatieRoleName)) {
                    $user->assignRole($role);
                }

                // Determine scope_id (varchar(26) — '' = global/no scope sentinel)
                $scopeId = match ($scopeType) {
                    'compound' => (string) ($user->compound_id ?? ''),
                    'unit' => (string) ($user->apartmentResidents()
                        ->where('is_primary', true)
                        ->value('unit_id') ?? ''),
                    default => '', // global — empty string sentinel
                };

                // Skip compound-scoped users with no compound assigned
                if ($scopeType === 'compound' && $scopeId === '') {
                    continue;
                }

                UserScopeAssignment::firstOrCreate([
                    'user_id' => $user->id,
                    'role_name' => $spatieRoleName,
                    'scope_type' => $scopeType,
                    'scope_id' => $scopeId,
                ]);
            }
        });
    }
}
