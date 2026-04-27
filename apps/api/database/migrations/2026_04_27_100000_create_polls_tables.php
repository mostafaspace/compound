<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poll_types', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->nullable()->constrained('compounds')->nullOnDelete();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#14b8a6');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('polls', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignUlid('building_id')->nullable()->constrained('buildings')->nullOnDelete();
            $table->foreignUlid('poll_type_id')->nullable()->constrained('poll_types')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('draft')->index();
            $table->string('scope')->default('compound');
            $table->boolean('is_anonymous')->default(false);
            $table->boolean('allow_multiple')->default(false);
            $table->unsignedTinyInteger('max_choices')->nullable();
            $table->string('eligibility')->default('all_verified');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('poll_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->string('label', 255);
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedInteger('votes_count')->default(0);
            $table->timestamps();
        });

        Schema::create('poll_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('voted_at');
            $table->unique(['poll_id', 'user_id']);
        });

        Schema::create('poll_vote_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('poll_vote_id')->constrained('poll_votes')->cascadeOnDelete();
            $table->foreignId('poll_option_id')->constrained('poll_options')->cascadeOnDelete();
            $table->unique(['poll_vote_id', 'poll_option_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_vote_options');
        Schema::dropIfExists('poll_votes');
        Schema::dropIfExists('poll_options');
        Schema::dropIfExists('polls');
        Schema::dropIfExists('poll_types');
    }
};
