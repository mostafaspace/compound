<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('vehicle_notifications')) {
            Schema::create('vehicle_notifications', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('sender_user_id')->constrained('users')->restrictOnDelete();
                $table->foreignUlid('sender_unit_id')->nullable()->constrained('units')->nullOnDelete();
                $table->string('sender_mode')->index();
                $table->string('sender_alias', 50)->nullable();
                $table->foreignId('target_vehicle_id')->nullable()->constrained('apartment_vehicles')->nullOnDelete();
                $table->foreignUlid('target_unit_id')->nullable()->constrained('units')->nullOnDelete();
                $table->string('target_plate_query');
                $table->text('message');
                $table->timestamps();

                $table->index('sender_user_id');
                $table->index('target_vehicle_id');
            });
        }

        if (! Schema::hasTable('vehicle_notification_recipients')) {
            Schema::create('vehicle_notification_recipients', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('vehicle_notification_id')->constrained('vehicle_notifications')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'read_at']);
                $table->unique(['vehicle_notification_id', 'user_id'], 'vnr_notification_user_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_notification_recipients');
        Schema::dropIfExists('vehicle_notifications');
    }
};
