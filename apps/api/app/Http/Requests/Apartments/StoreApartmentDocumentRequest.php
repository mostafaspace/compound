<?php

namespace App\Http\Requests\Apartments;

use App\Enums\ApartmentDocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApartmentDocumentRequest extends FormRequest
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
            'document_type' => ['required', 'string', Rule::enum(ApartmentDocumentType::class)],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,heic', 'max:10240'],
        ];
    }
}
