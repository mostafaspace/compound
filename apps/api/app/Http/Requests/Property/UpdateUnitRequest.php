<?php

namespace App\Http\Requests\Property;

use App\Enums\UnitStatus;
use App\Enums\UnitType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
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
        $unit = $this->route('unit');

        return [
            'floorId' => [
                'sometimes',
                'nullable',
                'string',
                Rule::exists('floors', 'id')->where('building_id', $unit?->building_id),
            ],
            'unitNumber' => [
                'sometimes',
                'required',
                'string',
                'max:40',
                Rule::unique('units', 'unit_number')
                    ->where('building_id', $unit?->building_id)
                    ->ignore($unit?->id),
            ],
            'type' => ['sometimes', 'required', Rule::enum(UnitType::class)],
            'areaSqm' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99'],
            'bedrooms' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50'],
            'status' => ['sometimes', 'required', Rule::enum(UnitStatus::class)],
        ];
    }
}
