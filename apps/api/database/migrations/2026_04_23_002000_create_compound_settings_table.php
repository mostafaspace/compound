<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compound_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('compound_id')->nullable()->constrained('compounds')->cascadeOnDelete();
            $table->string('namespace', 64)->index();
            $table->string('key', 128);
            $table->json('value');
            $table->timestamps();

            // Null compound_id = global default; compound_id set = per-compound override
            $table->unique(['compound_id', 'namespace', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compound_settings');
    }
};
