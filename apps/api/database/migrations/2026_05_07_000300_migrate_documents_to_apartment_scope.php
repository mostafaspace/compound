<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_documents') && ! Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('user_documents', function (Blueprint $table): void {
                $table->foreignId('migrated_to_apartment_document_id')
                    ->nullable()
                    ->constrained('apartment_documents')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('owner_registration_documents') && ! Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('owner_registration_documents', function (Blueprint $table): void {
                $table->foreignId('migrated_to_apartment_document_id')
                    ->nullable()
                    ->constrained('apartment_documents')
                    ->nullOnDelete();
            });
        }

        $this->migrateOwnerRegistrationDocuments();
        $this->migrateUserDocuments();
    }

    public function down(): void
    {
        $migratedIds = collect();

        if (Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id')) {
            $migratedIds = $migratedIds->merge(
                DB::table('user_documents')
                    ->whereNotNull('migrated_to_apartment_document_id')
                    ->pluck('migrated_to_apartment_document_id')
            );
        }

        if (Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id')) {
            $migratedIds = $migratedIds->merge(
                DB::table('owner_registration_documents')
                    ->whereNotNull('migrated_to_apartment_document_id')
                    ->pluck('migrated_to_apartment_document_id')
            );
        }

        DB::table('apartment_documents')
            ->whereIn('id', $migratedIds->filter()->unique()->values()->all())
            ->delete();

        if (Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('user_documents', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('migrated_to_apartment_document_id');
            });
        }

        if (Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('owner_registration_documents', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('migrated_to_apartment_document_id');
            });
        }
    }

    private function migrateOwnerRegistrationDocuments(): void
    {
        if (! Schema::hasTable('owner_registration_documents') || ! Schema::hasTable('owner_registration_requests')) {
            return;
        }

        DB::table('owner_registration_documents as ord')
            ->join('owner_registration_requests as orr', 'orr.id', '=', 'ord.owner_registration_request_id')
            ->whereNotNull('orr.unit_id')
            ->whereNull('ord.migrated_to_apartment_document_id')
            ->orderBy('ord.id')
            ->select('ord.*', 'orr.unit_id as resolved_unit_id', 'orr.user_id as resolved_user_id')
            ->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $apartmentDocumentId = DB::table('apartment_documents')->insertGetId([
                        'unit_id' => $row->resolved_unit_id,
                        'uploaded_by_user_id' => $row->resolved_user_id,
                        'document_type' => $this->mapDocType($row->type ?? 'other'),
                        'file_path' => $row->path,
                        'mime_type' => $row->mime_type ?? null,
                        'size_bytes' => $row->size_bytes ?? null,
                        'status' => 'active',
                        'version' => 1,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]);

                    DB::table('owner_registration_documents')
                        ->where('id', $row->id)
                        ->update(['migrated_to_apartment_document_id' => $apartmentDocumentId]);
                }
            }, 'ord.id', 'id');
    }

    private function migrateUserDocuments(): void
    {
        if (! Schema::hasTable('user_documents') || ! Schema::hasColumn('user_documents', 'unit_id')) {
            return;
        }

        DB::table('user_documents as ud')
            ->leftJoin('document_types as dt', 'dt.id', '=', 'ud.document_type_id')
            ->whereNotNull('ud.unit_id')
            ->whereNull('ud.migrated_to_apartment_document_id')
            ->orderBy('ud.id')
            ->select('ud.*', 'dt.key as document_type_key')
            ->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $apartmentDocumentId = DB::table('apartment_documents')->insertGetId([
                        'unit_id' => $row->unit_id,
                        'uploaded_by_user_id' => $row->user_id,
                        'document_type' => $this->mapDocType($row->document_type_key ?? 'other'),
                        'file_path' => $row->storage_path,
                        'mime_type' => $row->mime_type ?? null,
                        'size_bytes' => $row->size_bytes ?? null,
                        'status' => 'active',
                        'version' => 1,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]);

                    DB::table('user_documents')
                        ->where('id', $row->id)
                        ->update(['migrated_to_apartment_document_id' => $apartmentDocumentId]);
                }
            }, 'ud.id', 'id');
    }

    private function mapDocType(string $source): string
    {
        return match (strtolower($source)) {
            'contract', 'lease', 'rental_contract' => 'lease',
            'id', 'id_card', 'id_copy', 'national_id', 'passport' => 'id_copy',
            'utility', 'utility_bill' => 'utility_bill',
            'handover', 'ownership', 'ownership_proof', 'title_deed' => 'ownership_proof',
            default => 'other',
        };
    }
};
