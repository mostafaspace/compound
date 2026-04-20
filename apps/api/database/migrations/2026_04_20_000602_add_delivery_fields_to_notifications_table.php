<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->string('channel')->default('in_app')->after('category');
            $table->string('priority')->default('normal')->after('channel');
            $table->timestamp('delivered_at')->nullable()->after('archived_at');
            $table->unsignedInteger('delivery_attempts')->default(0)->after('delivered_at');
            $table->text('last_delivery_error')->nullable()->after('delivery_attempts');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropColumn([
                'channel',
                'priority',
                'delivered_at',
                'delivery_attempts',
                'last_delivery_error',
            ]);
        });
    }
};
