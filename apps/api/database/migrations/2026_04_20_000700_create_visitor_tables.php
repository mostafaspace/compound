<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_requests', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->string('visitor_name');
            $table->string('visitor_phone')->nullable();
            $table->string('vehicle_plate')->nullable();
            $table->timestamp('visit_starts_at');
            $table->timestamp('visit_ends_at');
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('allowed_at')->nullable();
            $table->timestamp('denied_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('decision_reason')->nullable();
            $table->timestamps();

            $table->index(['unit_id', 'status']);
            $table->index(['host_user_id', 'status']);
            $table->index(['visit_starts_at', 'visit_ends_at']);
        });

        Schema::create('visitor_passes', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('visitor_request_id')->constrained('visitor_requests')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('status')->default('active')->index();
            $table->timestamp('expires_at');
            $table->unsignedSmallInteger('max_uses')->default(1);
            $table->unsignedSmallInteger('uses_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['visitor_request_id', 'status']);
            $table->index(['expires_at', 'status']);
        });

        Schema::create('visitor_scan_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('visitor_request_id')->nullable()->constrained('visitor_requests')->nullOnDelete();
            $table->foreignUlid('visitor_pass_id')->nullable()->constrained('visitor_passes')->nullOnDelete();
            $table->foreignId('scanned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('token_fingerprint')->nullable();
            $table->string('result')->index();
            $table->string('decision')->nullable();
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['visitor_request_id', 'created_at']);
            $table->index(['scanned_by', 'created_at']);
        });

        Schema::create('visitor_event_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('visitor_request_id')->constrained('visitor_requests')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type')->index();
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['visitor_request_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_event_logs');
        Schema::dropIfExists('visitor_scan_logs');
        Schema::dropIfExists('visitor_passes');
        Schema::dropIfExists('visitor_requests');
    }
};
