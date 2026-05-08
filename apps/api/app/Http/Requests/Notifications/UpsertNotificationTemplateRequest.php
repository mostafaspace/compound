<?php

namespace App\Http\Requests\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpsertNotificationTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'compound_id' => ['nullable', 'string', 'exists:compounds,id'],
            'category' => ['required', new Enum(NotificationCategory::class)],
            'channel' => ['required', new Enum(NotificationChannel::class)],
            'locale' => ['required', 'string', 'in:en,ar'],
            'subject' => ['nullable', 'string', 'max:200'],
            'title_template' => ['required', 'string', 'max:200'],
            'body_template' => ['required', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }
}
