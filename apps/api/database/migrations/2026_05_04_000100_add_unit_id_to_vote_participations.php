<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vote_participations', function (Blueprint $table): void {
            $table->foreignUlid('unit_id')->nullable()->after('user_id')->constrained('units')->nullOnDelete();
            // One vote per apartment per formal vote
            $table->unique(['vote_id', 'unit_id'], 'vote_participations_vote_unit_unique');
        });
    }

    public function down(): void
    {
        Schema::table('vote_participations', function (Blueprint $table): void {
            $table->dropUnique('vote_participations_vote_unit_unique');
            $table->dropConstrainedForeignId('unit_id');
        });
    }
};
