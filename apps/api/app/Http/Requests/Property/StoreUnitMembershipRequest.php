<?php

namespace App\Http\Requests\Property;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitMembershipRequest extends FormRequest
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
            'relationType' => ['required', Rule::enum(UnitRelationType::class)],
            'startsAt' => ['nullable', 'date'],
            'endsAt' => ['nullable', 'date', 'after_or_equal:startsAt'],
            'isPrimary' => ['nullable', 'boolean'],
            'verificationStatus' => ['nullable', Rule::enum(VerificationStatus::class)],
            'residentName' => ['nullable', 'string', 'max:255'],
            'residentPhone' => ['nullable', 'string', 'max:20'],
            'phonePublic' => ['nullable', 'boolean'],
            'residentEmail' => ['nullable', 'email', 'max:255'],
            'emailPublic' => ['nullable', 'boolean'],
            'hasVehicle' => ['nullable', 'boolean'],
            'vehiclePlate' => ['nullable', 'string', 'max:20', 'required_if:hasVehicle,true'],
            'parkingSpotCode' => ['nullable', 'string', 'max:50'],
            'garageStickerCode' => ['nullable', 'string', 'max:50'],
        ];
    }
}
