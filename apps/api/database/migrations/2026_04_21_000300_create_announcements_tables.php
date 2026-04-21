<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category')->index();
            $table->string('priority')->default('normal')->index();
            $table->string('status')->default('draft')->index();
            $table->string('target_type')->default('all')->index();
            $table->json('target_ids')->nullable();
            $table->string('target_role')->nullable()->index();
            $table->boolean('requires_verified_membership')->default(false);
            $table->boolean('requires_acknowledgement')->default(false);
            $table->string('title_en');
            $table->string('title_ar');
            $table->text('body_en');
            $table->text('body_ar');
            $table->json('attachments')->nullable();
            $table->unsignedInteger('revision')->default(1);
            $table->json('last_published_snapshot')->nullable();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('archived_at')->nullable()->index();
            $table->timestamps();

            $table->index(['status', 'scheduled_at', 'expires_at']);
            $table->index(['target_type', 'target_role']);
        });

        Schema::create('announcement_revisions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('announcement_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('revision');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('snapshot');
            $table->json('change_summary')->nullable();
            $table->timestamps();

            $table->unique(['announcement_id', 'revision']);
        });

        Schema::create('announcement_acknowledgements', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('acknowledged_at');
            $table->timestamps();

            $table->unique(['announcement_id', 'user_id']);
            $table->index(['user_id', 'acknowledged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_acknowledgements');
        Schema::dropIfExists('announcement_revisions');
        Schema::dropIfExists('announcements');
    }
};
