<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table): void {
            if (Schema::hasColumn('units', 'has_vehicle')) {
                $table->dropColumn('has_vehicle');
            }
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table): void {
            if (! Schema::hasColumn('units', 'has_vehicle')) {
                $table->boolean('has_vehicle')->default(true)->after('status');
            }
        });
    }
};
