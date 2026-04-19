<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resident_invitations', function (Blueprint $table): void {
            $table->timestamp('last_sent_at')->nullable()->after('revoked_at');
            $table->unsignedSmallInteger('delivery_count')->default(0)->after('last_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('resident_invitations', function (Blueprint $table): void {
            $table->dropColumn(['last_sent_at', 'delivery_count']);
        });
    }
};
