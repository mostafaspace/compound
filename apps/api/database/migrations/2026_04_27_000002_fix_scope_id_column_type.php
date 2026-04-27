<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_scope_assignments', function (Blueprint $table): void {
            $table->string('scope_id', 26)->default('')->change();
        });

        // Fix existing rows: integer 0 (global sentinel) → empty string
        DB::table('user_scope_assignments')
            ->where('scope_id', '0')
            ->update(['scope_id' => '']);
    }

    public function down(): void
    {
        Schema::table('user_scope_assignments', function (Blueprint $table): void {
            $table->unsignedBigInteger('scope_id')->default(0)->change();
        });
    }
};
