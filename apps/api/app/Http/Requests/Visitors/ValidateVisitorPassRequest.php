<?php

namespace App\Http\Requests\Visitors;

use Illuminate\Foundation\Http\FormRequest;

class ValidateVisitorPassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'min:32', 'max:255'],
        ];
    }
}
