<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_charges', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('charge_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->decimal('amount', 14, 2);
            $table->char('currency', 3)->default('EGP');
            $table->string('frequency'); // monthly | quarterly | annual | one_time
            $table->unsignedTinyInteger('billing_day')->nullable(); // 1–28
            $table->string('target_type')->default('all'); // all | floor | unit
            $table->json('target_ids')->nullable();
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('compound_id');
            $table->index('is_active');
            $table->index('frequency');
        });

        // Add missing columns to collection_campaigns
        Schema::table('collection_campaigns', function (Blueprint $table) {
            if (! Schema::hasColumn('collection_campaigns', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('collection_campaigns', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('target_amount');
            }
            if (! Schema::hasColumn('collection_campaigns', 'closed_at')) {
                $table->timestamp('closed_at')->nullable()->after('started_at');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_charges');

        Schema::table('collection_campaigns', function (Blueprint $table) {
            $table->dropColumn(array_filter([
                Schema::hasColumn('collection_campaigns', 'description') ? 'description' : null,
                Schema::hasColumn('collection_campaigns', 'started_at') ? 'started_at' : null,
                Schema::hasColumn('collection_campaigns', 'closed_at') ? 'closed_at' : null,
            ]));
        });
    }
};
