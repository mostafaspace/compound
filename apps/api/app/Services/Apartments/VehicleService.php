<?php

namespace App\Services\Apartments;

use App\Enums\PlateFormat;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapacityExceededException;

class VehicleService
{
    private const MAX_PER_UNIT = 4;

    public function __construct(private readonly PlateNormalizer $normalizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Unit $unit, User $actor, array $data): ApartmentVehicle
    {
        $count = ApartmentVehicle::query()->where('unit_id', $unit->id)->count();
        if ($count >= self::MAX_PER_UNIT) {
            throw new CapacityExceededException('Vehicle capacity exceeded');
        }

        $normalized = $this->normalizer->normalize(
            $data['plate_format'] ?? PlateFormat::LettersNumbers->value,
            $data['plate_letters_input'] ?? null,
            $data['plate_digits_input'] ?? '',
        );

        return ApartmentVehicle::query()->create([
            'unit_id' => $unit->id,
            'apartment_resident_id' => $data['apartment_resident_id'] ?? null,
            'plate' => $normalized->plate,
            'plate_format' => $data['plate_format'] ?? PlateFormat::LettersNumbers->value,
            'plate_letters_ar' => $normalized->lettersAr,
            'plate_letters_en' => $normalized->lettersEn,
            'plate_digits' => $normalized->digits,
            'plate_digits_normalized' => $normalized->digitsNormalized,
            'plate_normalized' => $normalized->plateNormalized,
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
        if (isset($data['plate_format']) || isset($data['plate_letters_input']) || isset($data['plate_digits_input'])) {
            $normalized = $this->normalizer->normalize(
                $data['plate_format'] ?? $vehicle->plate_format->value,
                $data['plate_letters_input'] ?? $vehicle->plate_letters_ar,
                $data['plate_digits_input'] ?? $vehicle->plate_digits,
            );
            $data = array_merge($data, [
                'plate' => $normalized->plate,
                'plate_letters_ar' => $normalized->lettersAr,
                'plate_letters_en' => $normalized->lettersEn,
                'plate_digits' => $normalized->digits,
                'plate_digits_normalized' => $normalized->digitsNormalized,
                'plate_normalized' => $normalized->plateNormalized,
            ]);
            unset($data['plate_letters_input'], $data['plate_digits_input']);
        }

        $vehicle->update($data);

        return $vehicle->refresh();
    }

    public function delete(ApartmentVehicle $vehicle): void
    {
        $vehicle->delete();
    }
}
