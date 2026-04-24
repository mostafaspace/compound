<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Device tokens for push notifications (FCM / APNs)
        Schema::create('device_tokens', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token');
            $table->string('platform');          // fcm | apns
            $table->string('device_name')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'token']);
            $table->index('user_id');
        });

        // Templates per category × channel × locale
        Schema::create('notification_templates', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->char('compound_id', 26)->nullable(); // null = global fallback; ULID FK
            $table->foreign('compound_id')->references('id')->on('compounds')->nullOnDelete();
            $table->string('category');          // NotificationCategory value
            $table->string('channel');           // push | email | sms
            $table->string('locale', 10);        // en | ar
            $table->string('subject')->nullable(); // email subject line
            $table->string('title_template');    // push / SMS title
            $table->text('body_template');       // short privacy-safe body (no PII)
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['compound_id', 'category', 'channel', 'locale'], 'notif_templates_unique');
            $table->index(['category', 'channel', 'locale']);
        });

        // Per-channel delivery attempt records
        Schema::create('notification_delivery_logs', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('notification_id');
            $table->foreign('notification_id')->references('id')->on('notifications')->cascadeOnDelete();
            $table->string('channel');           // push | email | sms
            $table->string('status');            // queued | sent | failed | retried | skipped
            $table->string('recipient')->nullable(); // obfuscated — last 4 chars of token/email
            $table->string('provider')->default('mock');
            $table->json('provider_response')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->timestamps();

            $table->index(['notification_id', 'channel']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_delivery_logs');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('device_tokens');
    }
};
