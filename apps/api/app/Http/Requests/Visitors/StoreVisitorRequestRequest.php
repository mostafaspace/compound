<?php

namespace App\Http\Requests\Visitors;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitorRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unitId' => ['required', 'exists:units,id'],
            'visitorName' => ['required', 'string', 'max:160'],
            'visitorPhone' => ['nullable', 'string', 'max:40'],
            'vehiclePlate' => ['nullable', 'string', 'max:40'],
            'visitStartsAt' => ['required', 'date'],
            'visitEndsAt' => ['required', 'date', 'after:visitStartsAt'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'pictureUrl' => ['nullable', 'string', 'url', 'max:2000'],
            'picture' => ['nullable', 'image', 'max:5120'],
            'numberOfVisitors' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }
}
