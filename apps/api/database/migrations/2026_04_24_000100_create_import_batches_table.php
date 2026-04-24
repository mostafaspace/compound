<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');           // ImportBatchType enum value
            $table->string('status');         // ImportBatchStatus enum value
            $table->string('original_filename');
            $table->boolean('is_dry_run')->default(false);
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->json('errors')->nullable();  // [{row, field, message}]
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'type', 'status']);
            $table->index(['actor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_batches');
    }
};
