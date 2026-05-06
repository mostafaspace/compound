<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('poll_votes', function (Blueprint $table): void {
            $table->dropUnique('poll_votes_poll_id_user_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('poll_votes', function (Blueprint $table): void {
            $table->unique(['poll_id', 'user_id']);
        });
    }
};
