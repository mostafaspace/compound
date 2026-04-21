<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_accounts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('unit_id')->constrained()->cascadeOnDelete();
            $table->decimal('balance', 14, 2)->default(0);
            $table->char('currency', 3)->default('EGP');
            $table->timestamps();

            $table->unique('unit_id');
        });

        Schema::create('charge_types', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->decimal('default_amount', 14, 2)->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();
        });

        Schema::create('collection_campaigns', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('status')->default('draft')->index();
            $table->decimal('target_amount', 14, 2)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('unit_account_id')->constrained()->cascadeOnDelete();
            $table->string('type')->index(); // charge, payment, penalty, adjustment, etc.
            $table->decimal('amount', 14, 2);
            $table->string('description')->nullable();
            $table->string('reference_type')->nullable();
            $table->ulid('reference_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['unit_account_id', 'type']);
            $table->index(['reference_type', 'reference_id']);
        });

        Schema::create('payment_submissions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('unit_account_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->char('currency', 3)->default('EGP');
            $table->string('method');
            $table->string('reference')->nullable();
            $table->string('proof_path')->nullable();
            $table->string('status')->default('submitted')->index();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_submissions');
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('collection_campaigns');
        Schema::dropIfExists('charge_types');
        Schema::dropIfExists('unit_accounts');
    }
};
