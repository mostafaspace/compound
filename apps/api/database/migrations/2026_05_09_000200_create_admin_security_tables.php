<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token_id')->nullable()->index();
            $table->string('ip_address', 45);
            $table->text('user_agent');
            $table->string('device_label')->nullable();
            $table->string('device_fingerprint_hash')->nullable();
            $table->string('country', 2)->nullable();
            $table->string('city')->nullable();
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'last_seen_at']);
            $table->index(['ip_address', 'last_seen_at']);
        });

        Schema::create('admin_security_flags', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('admin_session_id')->nullable()->constrained('admin_sessions')->nullOnDelete();
            $table->string('type'); // new_device, new_ip, too_many_ips, high_risk_action, failed_login_spike
            $table->string('severity')->default('info'); // info, warning, critical
            $table->string('status')->default('open'); // open, reviewed, dismissed
            $table->string('summary');
            $table->json('metadata')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['type', 'severity', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_security_flags');
        Schema::dropIfExists('admin_sessions');
    }
};
