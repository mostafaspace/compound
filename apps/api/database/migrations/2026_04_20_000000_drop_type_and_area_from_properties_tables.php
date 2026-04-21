<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            if (Schema::hasColumn('buildings', 'type')) {
                $table->dropColumn('type');
            }
        });

        Schema::table('units', function (Blueprint $table) {
            if (Schema::hasColumn('units', 'type')) {
                $table->dropColumn('type');
            }
            if (Schema::hasColumn('units', 'area_sqm')) {
                $table->dropColumn('area_sqm');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->string('type')->default('residential');
        });

        Schema::table('units', function (Blueprint $table) {
            $table->string('type')->default('apartment');
            $table->decimal('area_sqm', 10, 2)->nullable();
        });
    }
};
