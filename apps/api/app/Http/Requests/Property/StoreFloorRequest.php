<?php

namespace App\Http\Requests\Property;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFloorRequest extends FormRequest
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
            'label' => ['required', 'string', 'max:80'],
            'levelNumber' => [
                'required',
                'integer',
                'min:-20',
                'max:300',
                Rule::unique('floors', 'level_number')->where('building_id', $building?->id),
            ],
            'sortOrder' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
