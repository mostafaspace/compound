<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// CM-82 / CM-115: Governance meetings — agendas, minutes, attendance, action items
return new class extends Migration
{
    public function up(): void
    {
        // ─── Meetings ────────────────────────────────────────────────────────────
        Schema::create('meetings', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            // association | building | floor | committee
            $table->string('scope')->default('association')->index();
            // Optional reference to building/floor/other scope entity
            $table->string('scope_ref_id', 26)->nullable();
            // draft | scheduled | in_progress | completed | cancelled
            $table->string('status')->default('draft')->index();
            $table->timestamp('scheduled_at')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('location')->nullable();
            $table->string('location_url')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['compound_id', 'status']);
            $table->index(['compound_id', 'scheduled_at']);
        });

        // ─── Agenda items ─────────────────────────────────────────────────────────
        Schema::create('meeting_agenda_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(0);
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->foreignId('presenter_user_id')->nullable()->constrained('users')->nullOnDelete();
            // Optional link to another entity (vote, announcement, issue, etc.)
            $table->string('linked_type')->nullable();
            $table->string('linked_id', 26)->nullable();
            $table->timestamps();

            $table->index(['meeting_id', 'position']);
        });

        // ─── Participants ─────────────────────────────────────────────────────────
        Schema::create('meeting_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('invited_at')->useCurrent();
            // pending | accepted | declined
            $table->string('rsvp_status')->default('pending')->index();
            $table->boolean('attended')->default(false);
            $table->timestamp('attendance_confirmed_at')->nullable();
            $table->timestamps();

            $table->unique(['meeting_id', 'user_id']);
            $table->index(['meeting_id', 'attended']);
        });

        // ─── Minutes ─────────────────────────────────────────────────────────────
        Schema::create('meeting_minutes', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('meeting_id')->unique()->constrained('meetings')->cascadeOnDelete();
            $table->longText('body');
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // ─── Decisions ───────────────────────────────────────────────────────────
        Schema::create('meeting_decisions', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            // Optional link (vote, announcement, finance_campaign, expense, issue)
            $table->string('linked_type')->nullable();
            $table->string('linked_id', 26)->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('meeting_id');
        });

        // ─── Action items ─────────────────────────────────────────────────────────
        Schema::create('meeting_action_items', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            // open | in_progress | done | cancelled
            $table->string('status')->default('open')->index();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['meeting_id', 'status']);
            $table->index(['assigned_to', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_action_items');
        Schema::dropIfExists('meeting_decisions');
        Schema::dropIfExists('meeting_minutes');
        Schema::dropIfExists('meeting_participants');
        Schema::dropIfExists('meeting_agenda_items');
        Schema::dropIfExists('meetings');
    }
};
