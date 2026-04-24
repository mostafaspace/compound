<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Reserve Funds ──────────────────────────────────────────────────────
        Schema::create('reserve_funds', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('balance', 14, 2)->default(0);
            $table->char('currency', 3)->default('EGP');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('compound_id');
        });

        Schema::create('reserve_fund_movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('reserve_fund_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // deposit | withdrawal | transfer
            $table->decimal('amount', 14, 2);
            $table->string('description')->nullable();
            $table->string('reference')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['reserve_fund_id', 'type']);
        });

        // ── Vendors ────────────────────────────────────────────────────────────
        Schema::create('vendors', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('other'); // contractor | supplier | service_provider | legal_advisor | other
            $table->string('contact_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('compound_id');
        });

        // ── Budgets ────────────────────────────────────────────────────────────
        Schema::create('budgets', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('period_type'); // annual | monthly
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month')->nullable(); // null for annual
            $table->string('status')->default('draft'); // draft | active | closed
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'status']);
            $table->index(['compound_id', 'period_year']);
        });

        Schema::create('budget_categories', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('budget_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('planned_amount', 14, 2)->default(0);
            $table->decimal('actual_amount', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('budget_id');
        });

        // ── Expenses ───────────────────────────────────────────────────────────
        Schema::create('expenses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('budget_category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('amount', 14, 2);
            $table->char('currency', 3)->default('EGP');
            $table->date('expense_date');
            $table->string('status')->default('draft'); // draft | pending_approval | approved | rejected
            $table->string('receipt_path')->nullable();
            $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'status']);
            $table->index(['compound_id', 'expense_date']);
            $table->index('budget_category_id');
        });

        Schema::create('expense_approvals', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('expense_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action'); // approve | reject
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index('expense_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_approvals');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('budget_categories');
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('reserve_fund_movements');
        Schema::dropIfExists('reserve_funds');
    }
};
