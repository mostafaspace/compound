<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('representative_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('building_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('floor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->index();
            $table->date('starts_at');
            $table->date('ends_at')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->string('contact_visibility')->default('all_residents');
            $table->foreignId('appointed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'role', 'is_active']);
            $table->index(['building_id', 'role', 'is_active']);
            $table->index(['floor_id', 'role', 'is_active']);
            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('representative_assignments');
    }
};
