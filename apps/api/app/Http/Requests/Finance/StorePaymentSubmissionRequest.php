<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentSubmissionRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999999.99'],
            'currency' => ['nullable', 'string', 'size:3'],
            'method' => ['required', 'string', 'max:80'],
            'reference' => ['nullable', 'string', 'max:120'],
            'payment_date' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'proof' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
        ];
    }
}
