<?php

namespace App\Http\Requests\Notifications;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationPreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emailEnabled' => ['nullable', 'boolean'],
            'inAppEnabled' => ['nullable', 'boolean'],
            'pushEnabled' => ['nullable', 'boolean'],
            'quietHoursStart' => ['nullable', 'date_format:H:i'],
            'quietHoursEnd' => ['nullable', 'date_format:H:i'],
            'quietHoursTimezone' => ['nullable', 'string', 'timezone'],
            'mutedCategories' => ['nullable', 'array'],
            'mutedCategories.*' => [
                'string',
                Rule::in(['documents', 'visitors', 'issues', 'announcements', 'finance', 'system']),
            ],
        ];
    }
}
