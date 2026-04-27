<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_scope_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role_name', 64);
            $table->enum('scope_type', ['global', 'compound', 'building', 'floor', 'unit']);
            $table->string('scope_id', 26)->default('');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'role_name', 'scope_type', 'scope_id'], 'uq_user_role_scope');
            $table->index(['user_id', 'scope_type']);
            $table->index(['scope_type', 'scope_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_scope_assignments');
    }
};
