<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class OwnerRegistrationDecisionRequest extends FormRequest
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
        return match ($this->route()?->getActionMethod()) {
            'approve' => [
                'createUnitIfMissing' => ['sometimes', 'boolean'],
                'note' => ['sometimes', 'nullable', 'string', 'max:1000'],
            ],
            default => [
                'reason' => ['required', 'string', 'min:8', 'max:2000'],
            ],
        };
    }
}
