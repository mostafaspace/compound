<?php

namespace App\Http\Requests\OrgChart;

use App\Enums\ContactVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateRepresentativeAssignmentRequest extends FormRequest
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
            'contactVisibility' => ['nullable', 'string', new Enum(ContactVisibility::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'startsAt' => ['nullable', 'date'],
        ];
    }
}
