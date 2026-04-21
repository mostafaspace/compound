<?php

namespace App\Http\Requests\Finance;

use App\Models\Finance\ChargeType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChargeTypeRequest extends FormRequest
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
        /** @var ChargeType $chargeType */
        $chargeType = $this->route('chargeType');

        return [
            'name' => ['required', 'string', 'max:120'],
            'code' => [
                'required',
                'string',
                'max:40',
                'regex:/^\S+$/',
                Rule::unique('charge_types', 'code')->ignore($chargeType->id),
            ],
            'default_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'is_recurring' => ['nullable', 'boolean'],
        ];
    }
}
