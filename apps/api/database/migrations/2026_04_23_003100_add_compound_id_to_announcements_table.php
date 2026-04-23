<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table): void {
            // Nullable so existing rows stay valid; new announcements should always carry a compound.
            $table->foreignUlid('compound_id')
                ->nullable()
                ->after('id')
                ->constrained('compounds')
                ->nullOnDelete();

            $table->index('compound_id');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table): void {
            $table->dropForeign(['compound_id']);
            $table->dropColumn('compound_id');
        });
    }
};
