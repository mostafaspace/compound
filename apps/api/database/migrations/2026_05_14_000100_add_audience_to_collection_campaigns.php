<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collection_campaigns', function (Blueprint $table): void {
            if (! Schema::hasColumn('collection_campaigns', 'target_type')) {
                $table->string('target_type')->default('compound')->after('target_amount')->index();
            }

            if (! Schema::hasColumn('collection_campaigns', 'target_ids')) {
                $table->json('target_ids')->nullable()->after('target_type');
            }

            if (! Schema::hasColumn('collection_campaigns', 'currency')) {
                $table->char('currency', 3)->default('EGP')->after('target_ids');
            }
        });
    }

    public function down(): void
    {
        Schema::table('collection_campaigns', function (Blueprint $table): void {
            if (Schema::hasColumn('collection_campaigns', 'currency')) {
                $table->dropColumn('currency');
            }

            if (Schema::hasColumn('collection_campaigns', 'target_ids')) {
                $table->dropColumn('target_ids');
            }

            if (Schema::hasColumn('collection_campaigns', 'target_type')) {
                $table->dropColumn('target_type');
            }
        });
    }
};
