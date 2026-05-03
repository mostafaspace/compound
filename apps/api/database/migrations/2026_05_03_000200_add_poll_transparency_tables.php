<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add unit_id to poll_votes for one-vote-per-apartment enforcement
        Schema::table('poll_votes', function (Blueprint $table): void {
            $table->foreignUlid('unit_id')->nullable()->after('user_id')->constrained('units')->nullOnDelete();
            // One vote per apartment per poll
            $table->unique(['poll_id', 'unit_id'], 'poll_votes_poll_unit_unique');
        });

        // Track who received the poll notification and when
        Schema::create('poll_notification_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('notified_at');
            $table->string('channel')->default('in_app');
            $table->boolean('delivered')->default(false);
            $table->timestamp('delivered_at')->nullable();

            $table->unique(['poll_id', 'user_id', 'channel']);
        });

        // Track who viewed the poll and when (transparency)
        Schema::create('poll_view_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('first_viewed_at');
            $table->timestamp('last_viewed_at');
            $table->unsignedSmallInteger('view_count')->default(1);

            $table->unique(['poll_id', 'user_id']);
        });

        // Remove anonymous flag — transparency requires all voters visible
        Schema::table('polls', function (Blueprint $table): void {
            $table->dropColumn('is_anonymous');
        });
    }

    public function down(): void
    {
        Schema::table('polls', function (Blueprint $table): void {
            $table->boolean('is_anonymous')->default(false)->after('scope');
        });

        Schema::dropIfExists('poll_view_logs');
        Schema::dropIfExists('poll_notification_logs');

        Schema::table('poll_votes', function (Blueprint $table): void {
            $table->dropUnique('poll_votes_poll_unit_unique');
            $table->dropConstrainedForeignId('unit_id');
        });
    }
};
