<?php

namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;

class ParkingSpotService
{
    private const MAX_PER_UNIT = 4;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Unit $unit, User $actor, array $data): ApartmentParkingSpot
    {
        if (! $unit->has_parking) {
            throw new CapabilityDisabledException('Parking disabled for this unit');
        }

        $count = ApartmentParkingSpot::query()->where('unit_id', $unit->id)->count();
        if ($count >= self::MAX_PER_UNIT) {
            throw new CapacityExceededException('Parking capacity exceeded');
        }

        return ApartmentParkingSpot::query()->create([
            'unit_id' => $unit->id,
            'code' => $data['code'],
            'notes' => $data['notes'] ?? null,
            'created_by' => $actor->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ApartmentParkingSpot $spot, array $data): ApartmentParkingSpot
    {
        $spot->update($data);

        return $spot->refresh();
    }

    public function delete(ApartmentParkingSpot $spot): void
    {
        $spot->delete();
    }
}
