<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table): void {
            if (Schema::hasColumn('units', 'area_sqm')) {
                $table->dropColumn('area_sqm');
            }
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table): void {
            if (! Schema::hasColumn('units', 'area_sqm')) {
                $table->decimal('area_sqm', 10, 2)->nullable()->after('type');
            }
        });
    }
};
