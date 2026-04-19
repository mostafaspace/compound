<?php

namespace App\Http\Requests\Property;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFloorRequest extends FormRequest
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
        $floor = $this->route('floor');

        return [
            'label' => ['sometimes', 'required', 'string', 'max:80'],
            'levelNumber' => [
                'sometimes',
                'required',
                'integer',
                'min:-20',
                'max:300',
                Rule::unique('floors', 'level_number')
                    ->where('building_id', $floor?->building_id)
                    ->ignore($floor?->id),
            ],
            'sortOrder' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
