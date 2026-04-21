<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitAccountRequest extends FormRequest
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
            'unitId' => ['required', 'string', 'exists:units,id', Rule::unique('unit_accounts', 'unit_id')],
            'currency' => ['nullable', 'string', 'size:3'],
            'openingBalance' => ['nullable', 'numeric', 'min:-999999999.99', 'max:999999999.99'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
