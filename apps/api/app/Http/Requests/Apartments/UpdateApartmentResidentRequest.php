<?php

namespace App\Http\Requests\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApartmentResidentRequest extends FormRequest
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
            'relation_type' => ['sometimes', 'string', Rule::enum(UnitRelationType::class)],
            'is_primary' => ['sometimes', 'boolean'],
            'verification_status' => ['sometimes', 'string', Rule::enum(VerificationStatus::class)],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'resident_name' => ['nullable', 'string', 'max:200'],
            'resident_phone' => ['nullable', 'string', 'max:50'],
            'phone_public' => ['sometimes', 'boolean'],
            'resident_email' => ['nullable', 'email', 'max:200'],
            'email_public' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ];
    }
}
