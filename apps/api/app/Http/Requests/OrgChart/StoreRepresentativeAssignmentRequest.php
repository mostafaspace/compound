<?php

namespace App\Http\Requests\OrgChart;

use App\Enums\ContactVisibility;
use App\Enums\RepresentativeRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreRepresentativeAssignmentRequest extends FormRequest
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
            'userId' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', 'string', new Enum(RepresentativeRole::class)],
            'buildingId' => ['nullable', 'string', 'exists:buildings,id'],
            'floorId' => ['nullable', 'string', 'exists:floors,id'],
            'startsAt' => ['required', 'date'],
            'contactVisibility' => ['nullable', 'string', new Enum(ContactVisibility::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
