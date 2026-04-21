<?php

namespace App\Http\Requests\Finance;

use App\Enums\LedgerEntryType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLedgerEntryRequest extends FormRequest
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
            'type' => ['required', Rule::enum(LedgerEntryType::class)],
            'amount' => ['required', 'numeric', 'min:-999999999.99', 'max:999999999.99', 'not_in:0'],
            'description' => ['required', 'string', 'max:500'],
        ];
    }
}
