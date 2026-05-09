<?php

namespace App\Http\Requests\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class SendVehicleNotificationRequest extends FormRequest
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
            'message' => ['required', 'string', 'max:1000'],
            'sender_mode' => ['required', 'string', 'in:anonymous,identified'],
            'sender_alias' => ['nullable', 'string', 'max:50'],
        ];
    }
}
