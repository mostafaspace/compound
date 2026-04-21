<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurringChargeRequest extends FormRequest
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
            'compound_id' => ['required', 'string', 'exists:compounds,id'],
            'charge_type_id' => ['nullable', 'string', 'exists:charge_types,id'],
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'annual', 'one_time'])],
            'billing_day' => ['nullable', 'integer', 'between:1,28'],
            'target_type' => ['required', Rule::in(['all', 'floor', 'unit'])],
            'target_ids' => [
                Rule::requiredIf(fn () => $this->input('target_type') !== 'all'),
                'nullable',
                'array',
            ],
            'target_ids.*' => ['string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }
}
