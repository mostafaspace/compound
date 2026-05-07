<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table): void {
            $table->boolean('has_vehicle')->default(true)->after('status');
            $table->boolean('has_parking')->default(true)->after('has_vehicle');
        });

        Schema::create('apartment_residents', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('relation_type')->index();
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->string('verification_status')->default('pending')->index();
            $table->string('resident_name')->nullable();
            $table->string('resident_phone')->nullable();
            $table->boolean('phone_public')->default(false);
            $table->string('resident_email')->nullable();
            $table->boolean('email_public')->default(false);
            $table->string('photo_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['id', 'unit_id']);
            $table->index(['unit_id', 'user_id']);
            $table->index(['unit_id', 'verification_status']);
            $table->index(['user_id', 'verification_status']);
        });

        Schema::create('apartment_vehicles', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('apartment_resident_id')->nullable()->constrained('apartment_residents')->nullOnDelete();
            $table->string('plate');
            $table->string('make')->nullable();
            $table->string('model')->nullable();
            $table->string('color')->nullable();
            $table->string('sticker_code')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign(['apartment_resident_id', 'unit_id'])
                ->references(['id', 'unit_id'])
                ->on('apartment_residents');
            $table->index('apartment_resident_id');
            $table->index(['unit_id', 'plate']);
            $table->index(['unit_id', 'created_at']);
        });

        Schema::create('apartment_parking_spots', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->string('code');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['unit_id', 'code']);
            $table->index(['unit_id', 'created_at']);
        });

        Schema::create('apartment_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['unit_id', 'created_at']);
            $table->index(['author_id', 'created_at']);
        });

        Schema::create('violation_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->text('description')->nullable();
            $table->decimal('default_fee', 12, 2)->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['compound_id', 'is_active']);
        });

        Schema::create('apartment_violations', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('violation_rule_id')->constrained('violation_rules')->restrictOnDelete();
            $table->foreignId('applied_by')->constrained('users')->restrictOnDelete();
            $table->decimal('fee', 12, 2);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('paid_at')->nullable();
            $table->text('waived_reason')->nullable();
            $table->timestamps();

            $table->index(['unit_id', 'status']);
            $table->index(['violation_rule_id', 'status']);
        });

        Schema::create('apartment_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type')->index();
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('status')->default('active')->index();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('replaced_by_id')->nullable()->constrained('apartment_documents')->nullOnDelete();
            $table->timestamps();

            $table->index(['unit_id', 'document_type', 'status']);
            $table->index(['unit_id', 'status']);
            $table->index('replaced_by_id');
        });

        Schema::create('apartment_document_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('apartment_document_id')->constrained('apartment_documents')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('status')->default('pending_review')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['apartment_document_id', 'status']);
            $table->index(['status', 'reviewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_document_versions');
        Schema::dropIfExists('apartment_documents');
        Schema::dropIfExists('apartment_violations');
        Schema::dropIfExists('violation_rules');
        Schema::dropIfExists('apartment_notes');
        Schema::dropIfExists('apartment_parking_spots');
        Schema::dropIfExists('apartment_vehicles');
        Schema::dropIfExists('apartment_residents');

        Schema::table('units', function (Blueprint $table): void {
            $table->dropColumn(['has_vehicle', 'has_parking']);
        });
    }
};
