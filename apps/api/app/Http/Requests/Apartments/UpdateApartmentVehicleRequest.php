<?php

namespace App\Http\Requests\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApartmentVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'apartment_resident_id' => ['nullable', 'integer', 'exists:apartment_residents,id'],
            'plate' => ['sometimes', 'string', 'max:50'],
            'make' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:50'],
            'sticker_code' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
