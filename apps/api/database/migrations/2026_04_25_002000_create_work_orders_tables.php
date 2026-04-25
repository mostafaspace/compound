<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// CM-83 / CM-118: Maintenance work orders, vendor estimates, approvals, completion
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignUlid('issue_id')->nullable()->constrained('issues')->nullOnDelete();
            $table->foreignUlid('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignUlid('building_id')->nullable()->constrained('buildings')->nullOnDelete();
            $table->foreignUlid('unit_id')->nullable()->constrained('units')->nullOnDelete();

            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->index(); // plumbing, electrical, hvac, painting, cleaning, landscaping, security, general, other
            $table->string('priority')->default('medium')->index(); // low, medium, high, urgent
            $table->string('status')->default('draft')->index(); // draft, requested, quoted, approved, scheduled, in_progress, completed, rejected, cancelled

            // Cost tracking
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->decimal('approved_cost', 12, 2)->nullable();
            $table->decimal('actual_cost', 12, 2)->nullable();
            $table->foreignUlid('expense_id')->nullable()->constrained('expenses')->nullOnDelete();

            // People
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();

            // Dates
            $table->timestamp('target_completion_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            // Completion & rejection
            $table->text('completion_notes')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            $table->index(['compound_id', 'status']);
            $table->index(['compound_id', 'priority']);
        });

        Schema::create('work_order_estimates', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('work_order_id')->constrained('work_orders')->cascadeOnDelete();
            $table->foreignUlid('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index(); // pending, approved, rejected
            $table->foreignId('submitted_by')->constrained('users');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_estimates');
        Schema::dropIfExists('work_orders');
    }
};
