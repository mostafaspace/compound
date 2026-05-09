<?php

namespace App\Http\Requests\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class SearchVehicleNotificationRequest extends FormRequest
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
            'plate' => ['required', 'string', 'min:2', 'max:30'],
        ];
    }
}
