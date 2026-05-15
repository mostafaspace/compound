<?php

namespace App\Http\Requests\Property;

use App\Enums\UnitStatus;
use App\Enums\UnitType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
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
            'floorId' => [
                'nullable',
                'string',
                Rule::exists('floors', 'id')->where('building_id', $building?->id),
            ],
            'unitNumber' => [
                'required',
                'string',
                'max:40',
                Rule::unique('units', 'unit_number')->where('building_id', $building?->id),
            ],
            'type' => ['nullable', Rule::enum(UnitType::class)],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'status' => ['nullable', Rule::enum(UnitStatus::class)],
        ];
    }
}
