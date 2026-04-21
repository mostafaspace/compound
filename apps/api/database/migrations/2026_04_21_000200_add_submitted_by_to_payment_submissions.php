<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_submissions', function (Blueprint $table): void {
            if (! Schema::hasColumn('payment_submissions', 'submitted_by')) {
                $table->foreignId('submitted_by')->nullable()->after('unit_account_id')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_submissions', function (Blueprint $table): void {
            if (Schema::hasColumn('payment_submissions', 'submitted_by')) {
                $table->dropConstrainedForeignId('submitted_by');
            }
        });
    }
};
