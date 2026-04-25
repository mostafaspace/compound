<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// CM-81 / CM-112: Advanced security operations
return new class extends Migration
{
    public function up(): void
    {
        // ─── Gates / entry points ────────────────────────────────────────────────
        Schema::create('security_gates', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignUlid('building_id')->nullable()->constrained('buildings')->nullOnDelete();
            $table->string('name');
            $table->string('zone')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['compound_id', 'is_active']);
        });

        // ─── Security shifts ─────────────────────────────────────────────────────
        Schema::create('security_shifts', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->string('name');
            $table->string('status')->default('draft')->index(); // draft | active | closed
            $table->text('handover_notes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['compound_id', 'status']);
            $table->index(['compound_id', 'started_at']);
        });

        // ─── Shift assignments (guard ↔ gate ↔ shift) ───────────────────────────
        Schema::create('security_shift_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('shift_id')->constrained('security_shifts')->cascadeOnDelete();
            $table->foreignUlid('gate_id')->nullable()->constrained('security_gates')->nullOnDelete();
            $table->foreignId('guard_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['shift_id', 'guard_user_id']);
            $table->index(['guard_user_id', 'is_active']);
        });

        // ─── Security devices ─────────────────────────────────────────────────────
        Schema::create('security_devices', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->string('name');
            $table->string('device_identifier', 128)->unique();
            $table->string('app_version')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->string('status')->default('active')->index(); // active | revoked
            $table->foreignId('registered_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'status']);
        });

        // ─── Security incidents ───────────────────────────────────────────────────
        Schema::create('security_incidents', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignUlid('gate_id')->nullable()->constrained('security_gates')->nullOnDelete();
            $table->foreignUlid('shift_id')->nullable()->constrained('security_shifts')->nullOnDelete();
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            // denied_entry | suspicious_activity | emergency | vehicle_issue | operational_handover | other
            $table->string('type')->index();
            $table->string('title');
            $table->text('description');
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'type']);
            $table->index(['compound_id', 'occurred_at']);
            $table->index(['shift_id', 'occurred_at']);
        });

        // ─── Manual visitor entries ───────────────────────────────────────────────
        Schema::create('manual_visitor_entries', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignUlid('gate_id')->nullable()->constrained('security_gates')->nullOnDelete();
            $table->foreignUlid('shift_id')->nullable()->constrained('security_shifts')->nullOnDelete();
            $table->foreignId('processed_by')->constrained('users')->cascadeOnDelete();
            $table->string('visitor_name');
            $table->string('visitor_phone')->nullable();
            $table->string('vehicle_plate')->nullable();
            $table->foreignId('host_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('host_unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->string('status')->default('allowed')->index(); // allowed | denied
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['compound_id', 'status']);
            $table->index(['compound_id', 'occurred_at']);
            $table->index(['shift_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_visitor_entries');
        Schema::dropIfExists('security_incidents');
        Schema::dropIfExists('security_devices');
        Schema::dropIfExists('security_shift_assignments');
        Schema::dropIfExists('security_shifts');
        Schema::dropIfExists('security_gates');
    }
};
