<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_memberships', function (Blueprint $table): void {
            $table->string('resident_name')->nullable()->after('verification_status');
            $table->string('resident_phone')->nullable()->after('resident_name');
            $table->boolean('phone_public')->default(false)->after('resident_phone');
            $table->string('resident_email')->nullable()->after('phone_public');
            $table->boolean('email_public')->default(false)->after('resident_email');
            $table->boolean('has_vehicle')->default(false)->after('email_public');
            $table->string('vehicle_plate')->nullable()->after('has_vehicle');
            $table->string('parking_spot_code')->nullable()->after('vehicle_plate');
            $table->string('garage_sticker_code')->nullable()->after('parking_spot_code');
        });
    }

    public function down(): void
    {
        Schema::table('unit_memberships', function (Blueprint $table): void {
            $table->dropColumn([
                'resident_name',
                'resident_phone',
                'phone_public',
                'resident_email',
                'email_public',
                'has_vehicle',
                'vehicle_plate',
                'parking_spot_code',
                'garage_sticker_code',
            ]);
        });
    }
};
