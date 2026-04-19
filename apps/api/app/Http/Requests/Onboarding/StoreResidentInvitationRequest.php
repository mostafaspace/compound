<?php

namespace App\Http\Requests\Onboarding;

use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResidentInvitationRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40', 'unique:users,phone'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'unitId' => ['nullable', 'string', 'exists:units,id'],
            'relationType' => ['nullable', Rule::enum(UnitRelationType::class)],
            'startsAt' => ['nullable', 'date'],
            'isPrimary' => ['nullable', 'boolean'],
            'expiresAt' => ['nullable', 'date', 'after:now'],
        ];
    }
}
