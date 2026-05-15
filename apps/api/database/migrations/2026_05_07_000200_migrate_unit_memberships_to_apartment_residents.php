<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unit_memberships') || ! Schema::hasTable('apartment_residents')) {
            return;
        }

        DB::table('unit_memberships')->orderBy('id')->chunkById(500, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('apartment_residents')->updateOrInsert(
                    ['id' => $row->id],
                    [
                        'unit_id' => $row->unit_id,
                        'user_id' => $row->user_id,
                        'relation_type' => $row->relation_type,
                        'starts_at' => $row->starts_at,
                        'ends_at' => $row->ends_at,
                        'is_primary' => $row->is_primary,
                        'verification_status' => $row->verification_status,
                        'created_by' => $row->created_by,
                        'resident_name' => $row->resident_name ?? null,
                        'resident_phone' => $row->resident_phone ?? null,
                        'phone_public' => $row->phone_public ?? false,
                        'resident_email' => $row->resident_email ?? null,
                        'email_public' => $row->email_public ?? false,
                        'photo_path' => null,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ],
                );

                if (! empty($row->vehicle_plate)) {
                    DB::table('apartment_vehicles')->updateOrInsert(
                        [
                            'unit_id' => $row->unit_id,
                            'apartment_resident_id' => $row->id,
                            'plate' => $row->vehicle_plate,
                        ],
                        [
                            'sticker_code' => $row->garage_sticker_code ?? null,
                            'created_by' => $row->created_by,
                            'created_at' => $row->created_at,
                            'updated_at' => $row->updated_at,
                        ],
                    );
                }

                if (! empty($row->parking_spot_code)) {
                    $parkingSpotExists = DB::table('apartment_parking_spots')
                        ->where('unit_id', $row->unit_id)
                        ->where('code', $row->parking_spot_code)
                        ->exists();

                    if (! $parkingSpotExists) {
                        DB::table('apartment_parking_spots')->insert([
                            'unit_id' => $row->unit_id,
                            'code' => $row->parking_spot_code,
                            'notes' => "Migrated from unit_memberships:{$row->id}",
                            'created_by' => $row->created_by,
                            'created_at' => $row->created_at,
                            'updated_at' => $row->updated_at,
                        ]);
                    }
                }
            }
        });

        if (Schema::hasColumn('unit_memberships', 'has_vehicle') && Schema::hasColumn('units', 'has_vehicle')) {
            $membershipUnitIds = DB::table('unit_memberships')
                ->pluck('unit_id')
                ->unique()
                ->all();

            if ($membershipUnitIds !== []) {
                DB::table('units')->whereIn('id', $membershipUnitIds)->update(['has_vehicle' => false]);
            }

            $unitsWithVehicle = DB::table('unit_memberships')
                ->where('has_vehicle', true)
                ->pluck('unit_id')
                ->unique()
                ->all();

            if ($unitsWithVehicle !== []) {
                DB::table('units')->whereIn('id', $unitsWithVehicle)->update(['has_vehicle' => true]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('unit_memberships')) {
            return;
        }

        $membershipIds = DB::table('unit_memberships')
            ->pluck('id')
            ->all();
        $membershipUnitIds = DB::table('unit_memberships')
            ->pluck('unit_id')
            ->unique()
            ->all();

        if ($membershipIds === []) {
            return;
        }

        if (Schema::hasColumn('units', 'has_vehicle') && $membershipUnitIds !== []) {
            DB::table('units')->whereIn('id', $membershipUnitIds)->update(['has_vehicle' => true]);
        }

        if (Schema::hasTable('apartment_parking_spots')) {
            $parkingSpotNotes = DB::table('unit_memberships')
                ->whereNotNull('parking_spot_code')
                ->pluck('id')
                ->map(fn ($id) => "Migrated from unit_memberships:{$id}")
                ->all();

            DB::table('apartment_parking_spots')
                ->whereIn('notes', $parkingSpotNotes)
                ->delete();
        }

        if (Schema::hasTable('apartment_vehicles')) {
            DB::table('apartment_vehicles')
                ->whereIn('apartment_resident_id', $membershipIds)
                ->delete();
        }

        if (Schema::hasTable('apartment_residents')) {
            DB::table('apartment_residents')
                ->whereIn('id', $membershipIds)
                ->delete();
        }
    }
};
