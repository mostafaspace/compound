<?php

namespace App\Http\Requests\Property;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBuildingRequest extends FormRequest
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
        $building = $this->route('building');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:32',
                'alpha_dash:ascii',
                Rule::unique('buildings', 'code')
                    ->where('compound_id', $building?->compound_id)
                    ->ignore($building?->id),
            ],
            'sortOrder' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
