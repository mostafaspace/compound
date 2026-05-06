<?php

namespace App\Http\Requests\Issues;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIssueRequest extends FormRequest
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
            'status' => ['sometimes', 'required', 'string', Rule::in(['new', 'triaged', 'assigned', 'in_progress', 'waiting_for_resident', 'resolved', 'closed', 'reopened'])],
            'priority' => ['sometimes', 'required', 'string', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'assignedTo' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')],
            'categoryId' => ['sometimes', 'required', 'string', Rule::in(['maintenance', 'security', 'cleaning', 'noise', 'other'])],
            'category' => ['sometimes', 'required', 'string', Rule::in(['maintenance', 'security', 'cleaning', 'noise', 'other'])],
            'title' => ['sometimes', 'required', 'string', 'min:3', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'min:2', 'max:5000'],
        ];
    }
}
