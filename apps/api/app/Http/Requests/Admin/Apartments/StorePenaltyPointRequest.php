<?php

namespace App\Http\Requests\Admin\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class StorePenaltyPointRequest extends FormRequest
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
            'points' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'violation_rule_id' => ['nullable', 'exists:violation_rules,id'],
        ];
    }
}
