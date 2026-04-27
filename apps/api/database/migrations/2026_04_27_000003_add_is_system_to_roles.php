<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** The 10 roles seeded by RbacSeeder that should never be deleted. */
    private const SYSTEM_ROLES = [
        'super_admin', 'compound_head', 'building_supervisor', 'floor_supervisor',
        'board_member', 'finance_reviewer', 'security_guard',
        'resident_owner', 'resident_tenant', 'support_agent',
    ];

    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->boolean('is_system')->default(false)->after('guard_name');
        });

        DB::table('roles')
            ->whereIn('name', self::SYSTEM_ROLES)
            ->update(['is_system' => true]);
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->dropColumn('is_system');
        });
    }
};
