<?php

namespace App\Http\Requests\Property;

use App\Enums\CompoundStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompoundRequest extends FormRequest
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
        $compound = $this->route('compound');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'legalName' => ['sometimes', 'nullable', 'string', 'max:200'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:32',
                'alpha_dash:ascii',
                Rule::unique('compounds', 'code')->ignore($compound?->id),
            ],
            'timezone' => ['sometimes', 'required', 'timezone'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'status' => ['sometimes', 'required', Rule::enum(CompoundStatus::class)],
        ];
    }
}
