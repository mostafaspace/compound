<?php

namespace App\Http\Requests\Documents;

use App\Enums\DocumentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewUserDocumentRequest extends FormRequest
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
            'status' => ['required', Rule::enum(DocumentStatus::class)],
            'reviewNote' => ['nullable', 'string', 'max:2000', 'required_if:status,rejected,missing'],
        ];
    }
}
