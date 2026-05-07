<?php

namespace App\Services;

use App\Enums\ImportBatchStatus;
use App\Enums\ImportBatchType;
use App\Enums\LedgerEntryType;
use App\Enums\UnitRelationType;
use App\Enums\UnitType;
use App\Enums\UserRole;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\UnitAccount;
use App\Models\Import\ImportBatch;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

class ImportService
{
    /**
     * Run an import (or dry-run).
     * Returns the persisted ImportBatch.
     */
    public function run(
        Compound $compound,
        User $actor,
        ImportBatchType $type,
        UploadedFile $file,
        bool $dryRun = true,
    ): ImportBatch {
        $rows = $this->parseCsv($file);

        $batch = ImportBatch::create([
            'compound_id' => $compound->id,
            'actor_id' => $actor->id,
            'type' => $type,
            'status' => ImportBatchStatus::Processing,
            'original_filename' => $file->getClientOriginalName(),
            'is_dry_run' => $dryRun,
            'total_rows' => count($rows),
            'started_at' => now(),
        ]);

        try {
            $result = match ($type) {
                ImportBatchType::Units => $this->importUnits($rows, $compound, $dryRun),
                ImportBatchType::Users => $this->importUsers($rows, $compound, $dryRun),
                ImportBatchType::OpeningBalances => $this->importOpeningBalances($rows, $compound, $actor, $dryRun),
            };

            $batch->update([
                'status' => ImportBatchStatus::Completed,
                'created_count' => $result['created'],
                'updated_count' => $result['updated'],
                'skipped_count' => $result['skipped'],
                'error_count' => count($result['errors']),
                'errors' => empty($result['errors']) ? null : $result['errors'],
                'completed_at' => now(),
            ]);
        } catch (Throwable $e) {
            $batch->update([
                'status' => ImportBatchStatus::Failed,
                'errors' => [['row' => 0, 'field' => null, 'message' => $e->getMessage()]],
                'error_count' => 1,
                'completed_at' => now(),
            ]);
        }

        return $batch->fresh() ?? $batch;
    }

    // -------------------------------------------------------------------------
    // CSV parsing
    // -------------------------------------------------------------------------

    /**
     * Parse a CSV file into an array of associative rows keyed by header.
     *
     * @return array<int, array<string, string>>
     */
    private function parseCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            return [];
        }

        $headers = null;
        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if ($headers === null) {
                // Normalise headers: lowercase, strip BOM, trim whitespace
                $headers = array_map(
                    fn (string $h): string => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', $h) ?? '')),
                    $line,
                );

                continue;
            }

            $row = [];
            foreach ($headers as $i => $header) {
                $row[$header] = isset($line[$i]) ? trim($line[$i]) : '';
            }
            $rows[] = $row;
        }

        fclose($handle);

        return $rows;
    }

    // -------------------------------------------------------------------------
    // Units import
    // -------------------------------------------------------------------------

    /**
     * @param  array<int, array<string, string>>  $rows
     * @return array{created: int, updated: int, skipped: int, errors: list<array<string,mixed>>}
     */
    private function importUnits(array $rows, Compound $compound, bool $dryRun): array
    {
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        foreach ($rows as $i => $row) {
            $rowNum = $i + 2; // 1-based + header row

            // --- Required fields ---
            $buildingCode = $row['building_code'] ?? '';
            $unitNumber = $row['unit_number'] ?? '';
            $typeValue = $row['type'] ?? '';

            if (blank($buildingCode) || blank($unitNumber) || blank($typeValue)) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'building_code,unit_number,type',
                    'message' => 'building_code, unit_number, and type are required.',
                ];

                continue;
            }

            // Validate unit type
            $unitType = UnitType::tryFrom($typeValue);
            if ($unitType === null) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'type',
                    'message' => "Invalid unit type '{$typeValue}'. Allowed: ".implode(', ', array_column(UnitType::cases(), 'value')),
                ];

                continue;
            }

            // Find building (must belong to this compound)
            $building = Building::query()
                ->where('compound_id', $compound->id)
                ->where('code', $buildingCode)
                ->first();

            if (! $building) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'building_code',
                    'message' => "Building with code '{$buildingCode}' not found in this compound.",
                ];

                continue;
            }

            // Resolve optional floor
            $floorId = null;
            $floorNumber = $row['floor_number'] ?? '';
            if (filled($floorNumber)) {
                $floorLevel = (int) $floorNumber;
                $floor = Floor::query()
                    ->where('building_id', $building->id)
                    ->where('level_number', $floorLevel)
                    ->first();

                if (! $floor) {
                    if (! $dryRun) {
                        $floor = Floor::create([
                            'building_id' => $building->id,
                            'level_number' => $floorLevel,
                            'label' => "Floor {$floorLevel}",
                        ]);
                    }
                    $floorId = $floor?->id;
                } else {
                    $floorId = $floor->id;
                }
            }

            $payload = [
                'compound_id' => $compound->id,
                'building_id' => $building->id,
                'floor_id' => $floorId,
                'type' => $unitType,
                'area_sqm' => filled($row['area_sqm'] ?? '') ? (float) $row['area_sqm'] : null,
                'bedrooms' => filled($row['bedrooms'] ?? '') ? (int) $row['bedrooms'] : null,
            ];

            if ($dryRun) {
                $result['created']++;

                continue;
            }

            $existing = Unit::query()
                ->where('building_id', $building->id)
                ->where('unit_number', $unitNumber)
                ->first();

            if ($existing) {
                $existing->update($payload);
                $result['updated']++;
            } else {
                Unit::create(array_merge($payload, ['unit_number' => $unitNumber]));
                $result['created']++;
            }
        }

        return $result;
    }

    // -------------------------------------------------------------------------
    // Users import
    // -------------------------------------------------------------------------

    /** Allowed roles for import (admin staff + residents only — no super_admin) */
    private const IMPORTABLE_ROLES = [
        UserRole::CompoundAdmin,
        UserRole::BoardMember,
        UserRole::FinanceReviewer,
        UserRole::SecurityGuard,
        UserRole::ResidentOwner,
        UserRole::ResidentTenant,
        UserRole::SupportAgent,
    ];

    /**
     * @param  array<int, array<string, string>>  $rows
     * @return array{created: int, updated: int, skipped: int, errors: list<array<string,mixed>>}
     */
    private function importUsers(array $rows, Compound $compound, bool $dryRun): array
    {
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        $allowedRoleValues = array_map(fn (UserRole $r): string => $r->value, self::IMPORTABLE_ROLES);

        foreach ($rows as $i => $row) {
            $rowNum = $i + 2;

            $name = $row['name'] ?? '';
            $email = $row['email'] ?? '';
            $phone = $row['phone'] ?? '';
            $roleValue = $row['role'] ?? '';

            if (blank($name) || blank($email) || blank($roleValue)) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'name,email,role',
                    'message' => 'name, email, and role are required.',
                ];

                continue;
            }

            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'email',
                    'message' => "Invalid email address '{$email}'.",
                ];

                continue;
            }

            if (! in_array($roleValue, $allowedRoleValues, true)) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'role',
                    'message' => "Invalid role '{$roleValue}'. Allowed: ".implode(', ', $allowedRoleValues),
                ];

                continue;
            }

            $role = UserRole::from($roleValue);

            if ($dryRun) {
                $result['created']++;

                continue;
            }

            DB::transaction(function () use ($row, $name, $email, $phone, $role, $compound, &$result): void {
                $user = User::query()->where('email', $email)->first();

                if ($user) {
                    // Update non-sensitive fields; never overwrite password
                    $user->update([
                        'name' => $name,
                        'phone' => $phone ?: $user->phone,
                        'role' => $role,
                        'compound_id' => $role === UserRole::SuperAdmin ? null : $compound->id,
                    ]);
                    $result['updated']++;
                } else {
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'phone' => $phone ?: null,
                        'role' => $role,
                        'compound_id' => $compound->id,
                        'password' => Hash::make(Str::random(20)),
                        'status' => 'active',
                    ]);
                    $result['created']++;
                }

                // Optionally attach to a unit
                $unitCode = $row['unit_code'] ?? '';
                $membershipTypeRaw = $row['membership_type'] ?? 'owner';
                $relationType = UnitRelationType::tryFrom($membershipTypeRaw) ?? UnitRelationType::Owner;

                if (filled($unitCode)) {
                    $unitForMembership = Unit::query()
                        ->where('compound_id', $compound->id)
                        ->where('unit_number', $unitCode)
                        ->first();

                    if ($unitForMembership && ! $unitForMembership->apartmentResidents()->where('user_id', $user->id)->exists()) {
                        $unitForMembership->apartmentResidents()->create([
                            'user_id' => $user->id,
                            'relation_type' => $relationType,
                            'starts_at' => now(),
                            'is_primary' => false,
                            'verification_status' => 'pending',
                        ]);
                    }
                }
            });
        }

        return $result;
    }

    // -------------------------------------------------------------------------
    // Opening balances import
    // -------------------------------------------------------------------------

    /**
     * @param  array<int, array<string, string>>  $rows
     * @return array{created: int, updated: int, skipped: int, errors: list<array<string,mixed>>}
     */
    private function importOpeningBalances(
        array $rows,
        Compound $compound,
        User $actor,
        bool $dryRun,
    ): array {
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        foreach ($rows as $i => $row) {
            $rowNum = $i + 2;

            $unitCode = $row['unit_code'] ?? '';
            $amountRaw = $row['amount'] ?? '';
            $currency = strtoupper($row['currency'] ?? '');
            $description = $row['description'] ?? 'Opening balance import';
            $dateRaw = $row['date'] ?? '';

            if (blank($unitCode) || blank($amountRaw) || blank($currency)) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'unit_code,amount,currency',
                    'message' => 'unit_code, amount, and currency are required.',
                ];

                continue;
            }

            if (! is_numeric($amountRaw)) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'amount',
                    'message' => "Amount must be a number, got '{$amountRaw}'.",
                ];

                continue;
            }

            $unit = Unit::query()
                ->where('compound_id', $compound->id)
                ->where('unit_number', $unitCode)
                ->first();

            if (! $unit) {
                $result['errors'][] = [
                    'row' => $rowNum,
                    'field' => 'unit_code',
                    'message' => "Unit '{$unitCode}' not found in this compound.",
                ];

                continue;
            }

            if ($dryRun) {
                $result['created']++;

                continue;
            }

            DB::transaction(function () use ($unit, $amountRaw, $currency, $description, $actor, &$result): void {
                // Ensure unit account exists (or create it)
                $account = UnitAccount::query()->where('unit_id', $unit->id)->first()
                    ?? UnitAccount::create([
                        'unit_id' => $unit->id,
                        'balance' => 0,
                        'currency' => $currency,
                    ]);

                $amount = (float) $amountRaw;

                LedgerEntry::create([
                    'unit_account_id' => $account->id,
                    'type' => LedgerEntryType::OpeningBalance,
                    'amount' => $amount,
                    'description' => $description,
                    'created_by' => $actor->id,
                ]);

                // Update account balance
                $account->increment('balance', $amount);

                $result['created']++;
            });
        }

        return $result;
    }
}
