<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class StoreChargeTypeRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:40', 'unique:charge_types,code', 'regex:/^\S+$/'],
            'default_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'is_recurring' => ['nullable', 'boolean'],
        ];
    }
}
