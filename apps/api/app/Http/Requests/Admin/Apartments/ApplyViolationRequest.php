<?php

namespace App\Http\Requests\Admin\Apartments;

use Illuminate\Foundation\Http\FormRequest;

class ApplyViolationRequest extends FormRequest
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
            'violation_rule_id' => ['required', 'integer', 'exists:violation_rules,id'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
