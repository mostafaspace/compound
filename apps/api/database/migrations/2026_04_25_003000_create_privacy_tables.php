<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// CM-84 / CM-121: Privacy – consent tracking, data export requests, legal hold
return new class extends Migration
{
    public function up(): void
    {
        // Track user consent to policy versions
        Schema::create('user_policy_consents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('policy_type')->index();  // privacy_policy, terms_of_service, data_processing
            $table->string('policy_version');        // e.g. "2026-04-01"
            $table->timestamp('accepted_at');
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'policy_type']);
        });

        // Data export requests (right to portability / access)
        Schema::create('data_export_requests', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('user_id')->constrained('users'); // subject of the export
            $table->string('status')->default('pending')->index(); // pending, processing, ready, failed, expired
            $table->json('modules')->nullable(); // which data modules to include
            $table->string('package_path')->nullable();  // server-side file path when ready
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Legal-hold flag — prevents deletion/anonymization of user records
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('legal_hold')->default(false)->after('status');
            $table->timestamp('anonymized_at')->nullable()->after('legal_hold');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['legal_hold', 'anonymized_at']);
        });
        Schema::dropIfExists('data_export_requests');
        Schema::dropIfExists('user_policy_consents');
    }
};
