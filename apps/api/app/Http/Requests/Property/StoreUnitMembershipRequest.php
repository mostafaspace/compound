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
        ];
    }
}
