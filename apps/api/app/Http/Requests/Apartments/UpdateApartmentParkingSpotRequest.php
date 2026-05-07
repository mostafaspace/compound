<?php

namespace App\Http\Requests\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApartmentParkingSpotRequest extends FormRequest
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
            'code' => ['sometimes', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
