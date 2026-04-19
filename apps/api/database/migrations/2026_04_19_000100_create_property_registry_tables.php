<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compounds', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('code')->unique();
            $table->string('timezone')->default('Africa/Cairo');
            $table->char('currency', 3)->default('EGP');
            $table->string('status')->default('draft')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('buildings', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['compound_id', 'code']);
        });

        Schema::create('floors', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('building_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->smallInteger('level_number');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['building_id', 'level_number']);
        });

        Schema::create('units', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('building_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('floor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('unit_number');
            $table->string('type')->default('apartment')->index();
            $table->decimal('area_sqm', 10, 2)->nullable();
            $table->unsignedSmallInteger('bedrooms')->nullable();
            $table->string('status')->default('active')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['building_id', 'unit_number']);
            $table->index(['compound_id', 'status']);
        });

        Schema::create('unit_memberships', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('relation_type')->index();
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->string('verification_status')->default('pending')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['unit_id', 'user_id']);
            $table->index(['user_id', 'verification_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_memberships');
        Schema::dropIfExists('units');
        Schema::dropIfExists('floors');
        Schema::dropIfExists('buildings');
        Schema::dropIfExists('compounds');
    }
};
