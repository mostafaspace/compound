<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('owner_registration_requests')) {
            Schema::create('owner_registration_requests', function (Blueprint $table): void {
                $table->ulid('id')->primary();
                $table->foreignUlid('compound_id')->constrained()->cascadeOnDelete();
                $table->foreignUlid('building_id')->constrained()->cascadeOnDelete();
                $table->foreignUlid('unit_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('full_name_arabic');
                $table->string('phone')->index();
                $table->string('email')->index();
                $table->string('apartment_code');
                $table->string('status')->default('under_review')->index();
                $table->boolean('owner_acknowledged')->default(false);
                $table->string('device_id', 191)->index();
                $table->string('request_token_hash', 64)->unique();
                $table->text('password_setup_token')->nullable();
                $table->timestamp('password_setup_expires_at')->nullable();
                $table->text('decision_reason')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->unique(['compound_id', 'email']);
                $table->index(['compound_id', 'status']);
                $table->index(['device_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('owner_registration_documents')) {
            Schema::create('owner_registration_documents', function (Blueprint $table): void {
                $table->id();
                $table->ulid('owner_registration_request_id');
                $table->string('type');
                $table->string('original_name');
                $table->string('path');
                $table->string('mime_type')->nullable();
                $table->unsignedBigInteger('size_bytes')->nullable();
                $table->timestamps();

                $table->foreign('owner_registration_request_id', 'owner_reg_docs_request_fk')
                    ->references('id')
                    ->on('owner_registration_requests')
                    ->cascadeOnDelete();
                $table->unique(['owner_registration_request_id', 'type'], 'owner_reg_docs_request_type_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_registration_documents');
        Schema::dropIfExists('owner_registration_requests');
    }
};
