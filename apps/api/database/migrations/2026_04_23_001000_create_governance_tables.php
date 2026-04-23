<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignUlid('building_id')->nullable()->constrained('buildings')->nullOnDelete();
            $table->string('type')->default('poll')->index();          // poll | election | decision
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('draft')->index();       // draft | active | closed | cancelled
            $table->string('scope')->default('compound');              // compound | building
            $table->string('eligibility')->default('owners_only');     // owners_only | owners_and_residents | all_verified
            $table->boolean('requires_doc_compliance')->default(false);
            $table->boolean('is_anonymous')->default(false);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('result_applied_at')->nullable();
            $table->timestamps();
        });

        Schema::create('vote_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('vote_id')->constrained('votes')->cascadeOnDelete();
            $table->string('label');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('vote_participations', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('vote_id')->constrained('votes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('option_id')->nullable()->constrained('vote_options')->nullOnDelete();
            $table->json('eligibility_snapshot');
            $table->timestamps();

            $table->unique(['vote_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vote_participations');
        Schema::dropIfExists('vote_options');
        Schema::dropIfExists('votes');
    }
};
