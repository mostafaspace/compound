<?php

namespace App\Http\Requests\Property;

use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Enums\VerificationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexUnitsRequest extends FormRequest
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
            'search' => ['nullable', 'string', 'max:120'],
            'compoundId' => ['nullable', 'string', Rule::exists('compounds', 'id')],
            'buildingId' => ['nullable', 'string', Rule::exists('buildings', 'id')],
            'floorId' => ['nullable', 'string', Rule::exists('floors', 'id')],
            'status' => ['nullable', Rule::enum(UnitStatus::class)],
            'type' => ['nullable', Rule::enum(UnitType::class)],
            'userId' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'relationType' => ['nullable', Rule::enum(UnitRelationType::class)],
            'verificationStatus' => ['nullable', Rule::enum(VerificationStatus::class)],
            'activeMembershipOnly' => ['nullable', 'boolean'],
            'includeArchived' => ['nullable', 'boolean'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
