<?php

namespace App\Http\Requests\Notifications;

use App\Enums\DevicePlatform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class RegisterDeviceTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', new Enum(DevicePlatform::class)],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }
}
