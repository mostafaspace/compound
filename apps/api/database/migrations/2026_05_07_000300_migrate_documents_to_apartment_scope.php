<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const MIGRATED_COLUMN = 'migrated_to_apartment_document_id';

    private const USER_DOCUMENTS_FK = 'user_docs_apartment_doc_fk';

    private const OWNER_REGISTRATION_DOCUMENTS_FK = 'owner_reg_docs_apartment_doc_fk';

    public function up(): void
    {
        if (Schema::hasTable('user_documents')) {
            $this->ensureMigratedReferenceColumn('user_documents', self::USER_DOCUMENTS_FK);
        }

        if (Schema::hasTable('owner_registration_documents')) {
            $this->ensureMigratedReferenceColumn('owner_registration_documents', self::OWNER_REGISTRATION_DOCUMENTS_FK);
        }

        $this->migrateOwnerRegistrationDocuments();
        $this->migrateUserDocuments();
    }

    public function down(): void
    {
        $migratedIds = collect();

        if (Schema::hasColumn('user_documents', self::MIGRATED_COLUMN)) {
            $migratedIds = $migratedIds->merge(
                DB::table('user_documents')
                    ->whereNotNull(self::MIGRATED_COLUMN)
                    ->pluck(self::MIGRATED_COLUMN)
            );
        }

        if (Schema::hasColumn('owner_registration_documents', self::MIGRATED_COLUMN)) {
            $migratedIds = $migratedIds->merge(
                DB::table('owner_registration_documents')
                    ->whereNotNull(self::MIGRATED_COLUMN)
                    ->pluck(self::MIGRATED_COLUMN)
            );
        }

        DB::table('apartment_documents')
            ->whereIn('id', $migratedIds->filter()->unique()->values()->all())
            ->delete();

        $this->dropMigratedReferenceColumn('user_documents');
        $this->dropMigratedReferenceColumn('owner_registration_documents');
    }

    private function ensureMigratedReferenceColumn(string $tableName, string $foreignKeyName): void
    {
        if (! Schema::hasColumn($tableName, self::MIGRATED_COLUMN)) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId(self::MIGRATED_COLUMN)->nullable();
            });
        }

        if ($this->hasForeignKeyForColumn($tableName, self::MIGRATED_COLUMN)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($foreignKeyName): void {
            $table->foreign(self::MIGRATED_COLUMN, $foreignKeyName)
                ->references('id')
                ->on('apartment_documents')
                ->nullOnDelete();
        });
    }

    private function dropMigratedReferenceColumn(string $tableName): void
    {
        if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, self::MIGRATED_COLUMN)) {
            return;
        }

        foreach ($this->foreignKeyNamesForColumn($tableName, self::MIGRATED_COLUMN) as $foreignKeyName) {
            Schema::table($tableName, function (Blueprint $table) use ($foreignKeyName): void {
                $table->dropForeign($foreignKeyName);
            });
        }

        Schema::table($tableName, function (Blueprint $table): void {
            $table->dropColumn(self::MIGRATED_COLUMN);
        });
    }

    private function hasForeignKeyForColumn(string $tableName, string $columnName): bool
    {
        return $this->foreignKeyNamesForColumn($tableName, $columnName) !== [];
    }

    /**
     * @return list<string>
     */
    private function foreignKeyNamesForColumn(string $tableName, string $columnName): array
    {
        return collect(Schema::getForeignKeys($tableName))
            ->filter(fn (array $foreignKey): bool => in_array($columnName, $foreignKey['columns'] ?? [], true))
            ->pluck('name')
            ->filter()
            ->values()
            ->all();
    }

    private function migrateOwnerRegistrationDocuments(): void
    {
        if (! Schema::hasTable('owner_registration_documents') || ! Schema::hasTable('owner_registration_requests')) {
            return;
        }

        DB::table('owner_registration_documents as ord')
            ->join('owner_registration_requests as orr', 'orr.id', '=', 'ord.owner_registration_request_id')
            ->whereNotNull('orr.unit_id')
            ->whereNull('ord.'.self::MIGRATED_COLUMN)
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
                        ->update([self::MIGRATED_COLUMN => $apartmentDocumentId]);
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
            ->whereNull('ud.'.self::MIGRATED_COLUMN)
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
                        ->update([self::MIGRATED_COLUMN => $apartmentDocumentId]);
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
