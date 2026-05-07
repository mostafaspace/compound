<?php

namespace App\Http\Requests\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class ReplaceApartmentDocumentRequest extends FormRequest
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
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,heic', 'max:10240'],
        ];
    }
}
