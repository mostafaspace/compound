<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class VerificationDecisionRequest extends FormRequest
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
        $noteRules = ['nullable', 'string', 'max:2000'];

        if ($this->routeIs('api.v1.verification-requests.reject', 'api.v1.verification-requests.request-more-info')) {
            array_unshift($noteRules, 'required');
        }

        return [
            'note' => $noteRules,
        ];
    }
}
