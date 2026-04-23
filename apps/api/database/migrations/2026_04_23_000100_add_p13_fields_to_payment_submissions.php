<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_submissions', function (Blueprint $table): void {
            $table->date('payment_date')->nullable()->after('reference');
            $table->text('correction_note')->nullable()->after('rejection_reason');
        });

        Schema::create('payment_allocations', function (Blueprint $table): void {
            $table->id();
            $table->string('payment_submission_id');
            $table->unsignedBigInteger('ledger_entry_id');
            $table->decimal('amount', 14, 2);
            $table->timestamps();

            $table->foreign('payment_submission_id')->references('id')->on('payment_submissions')->cascadeOnDelete();
            $table->foreign('ledger_entry_id')->references('id')->on('ledger_entries')->cascadeOnDelete();
            $table->unique(['payment_submission_id', 'ledger_entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
        Schema::table('payment_submissions', function (Blueprint $table): void {
            $table->dropColumn(['payment_date', 'correction_note']);
        });
    }
};
