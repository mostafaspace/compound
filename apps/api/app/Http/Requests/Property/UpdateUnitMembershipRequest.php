<?php

namespace App\Http\Requests\Property;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitMembershipRequest extends FormRequest
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
            'relationType' => ['sometimes', 'required', Rule::enum(UnitRelationType::class)],
            'startsAt' => ['sometimes', 'nullable', 'date'],
            'endsAt' => ['sometimes', 'nullable', 'date', 'after_or_equal:startsAt'],
            'isPrimary' => ['sometimes', 'boolean'],
            'verificationStatus' => ['sometimes', 'required', Rule::enum(VerificationStatus::class)],
            'residentName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'residentPhone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'phonePublic' => ['sometimes', 'boolean'],
            'residentEmail' => ['sometimes', 'nullable', 'email', 'max:255'],
            'emailPublic' => ['sometimes', 'boolean'],
        ];
    }
}
