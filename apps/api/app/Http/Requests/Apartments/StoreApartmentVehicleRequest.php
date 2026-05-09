<?php

namespace App\Http\Requests\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class StoreApartmentVehicleRequest extends FormRequest
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
            'plate_format' => ['required', 'string', 'in:letters_numbers,numbers_only'],
            'plate_letters_input' => ['nullable', 'string', 'max:50', 'required_if:plate_format,letters_numbers'],
            'plate_digits_input' => ['required', 'string', 'max:20'],
            'make' => ['nullable', 'string', 'max:80'],
            'model' => ['nullable', 'string', 'max:80'],
            'color' => ['nullable', 'string', 'max:40'],
            'sticker_code' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
