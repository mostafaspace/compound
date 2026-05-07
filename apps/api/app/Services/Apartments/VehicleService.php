<?php

namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;

class VehicleService
{
    private const MAX_PER_UNIT = 4;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Unit $unit, User $actor, array $data): ApartmentVehicle
    {
        if (! $unit->has_vehicle) {
            throw new CapabilityDisabledException('Vehicles disabled for this unit');
        }

        $count = ApartmentVehicle::query()->where('unit_id', $unit->id)->count();
        if ($count >= self::MAX_PER_UNIT) {
            throw new CapacityExceededException('Vehicle capacity exceeded');
        }

        return ApartmentVehicle::query()->create([
            'unit_id' => $unit->id,
            'apartment_resident_id' => $data['apartment_resident_id'] ?? null,
            'plate' => $data['plate'],
            'make' => $data['make'] ?? null,
            'model' => $data['model'] ?? null,
            'color' => $data['color'] ?? null,
            'sticker_code' => $data['sticker_code'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $actor->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ApartmentVehicle $vehicle, array $data): ApartmentVehicle
    {
        $vehicle->update($data);

        return $vehicle->refresh();
    }

    public function delete(ApartmentVehicle $vehicle): void
    {
        $vehicle->delete();
    }
}
