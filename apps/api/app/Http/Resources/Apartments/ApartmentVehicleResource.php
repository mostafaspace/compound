<?php

namespace App\Http\Resources\Apartments;

use App\Models\Apartments\ApartmentVehicle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentVehicle
 */
class ApartmentVehicleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'apartmentResidentId' => $this->apartment_resident_id,
            'plate' => $this->plate,
            'plateFormat' => $this->plate_format?->value,
            'plateLettersAr' => $this->plate_letters_ar,
            'plateLettersEn' => $this->plate_letters_en,
            'plateDigits' => $this->plate_digits,
            'make' => $this->make,
            'model' => $this->model,
            'color' => $this->color,
            'stickerCode' => $this->sticker_code,
            'notes' => $this->notes,
            'createdBy' => $this->created_by,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
