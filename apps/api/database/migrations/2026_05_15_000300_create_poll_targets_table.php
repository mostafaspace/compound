<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poll_targets', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->string('target_type');
            $table->string('target_id');
            $table->timestamps();

            $table->unique(['poll_id', 'target_type', 'target_id'], 'poll_targets_unique_scope');
            $table->index(['target_type', 'target_id'], 'poll_targets_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_targets');
    }
};
