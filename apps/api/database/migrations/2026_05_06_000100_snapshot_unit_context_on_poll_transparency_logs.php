<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('poll_notification_logs', function (Blueprint $table): void {
            $table->foreignUlid('unit_id')->nullable()->after('user_id')->constrained('units')->nullOnDelete();
            $table->string('unit_number')->nullable()->after('unit_id');
        });

        Schema::table('poll_view_logs', function (Blueprint $table): void {
            $table->foreignUlid('unit_id')->nullable()->after('user_id')->constrained('units')->nullOnDelete();
            $table->string('unit_number')->nullable()->after('unit_id');
        });
    }

    public function down(): void
    {
        Schema::table('poll_view_logs', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('unit_id');
            $table->dropColumn('unit_number');
        });

        Schema::table('poll_notification_logs', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('unit_id');
            $table->dropColumn('unit_number');
        });
    }
};
