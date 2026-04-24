<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->string('severity', 20)->default('info')->after('status_code');
            $table->string('reason', 500)->nullable()->after('severity');
            $table->index('severity');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex(['severity']);
            $table->dropColumn(['severity', 'reason']);
        });
    }
};
