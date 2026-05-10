<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('violation_rules', function (Blueprint $table): void {
            $table->unsignedInteger('default_points')->default(0)->after('default_fee');
        });

        Schema::create('apartment_penalty_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('violation_rule_id')->nullable()->constrained('violation_rules')->nullOnDelete();
            $table->integer('points');
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->foreignId('applied_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('voided_at')->nullable()->index();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('void_reason')->nullable();
            $table->timestamps();

            $table->index(['unit_id', 'voided_at', 'expires_at']);
            $table->index(['violation_rule_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_penalty_events');

        Schema::table('violation_rules', function (Blueprint $table): void {
            $table->dropColumn('default_points');
        });
    }
};
