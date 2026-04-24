<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Payment sessions — initiated by resident, pending gateway confirmation
        Schema::create('payment_sessions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('unit_account_id');
            $table->unsignedBigInteger('initiated_by');
            $table->string('provider', 50); // mock, stripe, paymob, etc.
            $table->string('provider_session_id')->nullable();
            $table->decimal('amount', 14, 2);
            $table->string('currency', 10)->default('EGP');
            $table->string('status', 30)->default('pending'); // pending, confirmed, failed, expired, refunded
            $table->string('return_url')->nullable();
            $table->json('provider_metadata')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('unit_account_id')->references('id')->on('unit_accounts')->cascadeOnDelete();
            $table->foreign('initiated_by')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['unit_account_id', 'status']);
        });

        // Gateway transactions — one per webhook event or manual confirm
        Schema::create('gateway_transactions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('payment_session_id');
            $table->string('provider', 50);
            $table->string('provider_transaction_id'); // provider's unique tx ID
            $table->string('event_type', 60); // payment.succeeded, payment.failed, refund.created, dispute.opened
            $table->string('status', 30); // confirmed, failed, refunded, disputed
            $table->decimal('amount', 14, 2);
            $table->string('currency', 10)->default('EGP');
            $table->string('payment_submission_id')->nullable(); // linked after reconciliation
            $table->json('raw_payload');
            $table->boolean('processed')->default(false);
            $table->text('processing_error')->nullable();
            $table->timestamps();

            $table->foreign('payment_session_id')->references('id')->on('payment_sessions')->cascadeOnDelete();
            $table->foreign('payment_submission_id')->references('id')->on('payment_submissions')->nullOnDelete();
            // Idempotency: same provider tx ID cannot be processed twice
            $table->unique(['provider', 'provider_transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gateway_transactions');
        Schema::dropIfExists('payment_sessions');
    }
};
