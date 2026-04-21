<?php

namespace App\Http\Requests\Announcements;

use App\Enums\AnnouncementCategory;
use App\Enums\AnnouncementPriority;
use App\Enums\AnnouncementTargetType;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'titleEn' => ['sometimes', 'string', 'max:255'],
            'titleAr' => ['sometimes', 'string', 'max:255'],
            'bodyEn' => ['sometimes', 'string', 'max:10000'],
            'bodyAr' => ['sometimes', 'string', 'max:10000'],
            'category' => ['sometimes', Rule::enum(AnnouncementCategory::class)],
            'priority' => ['sometimes', Rule::enum(AnnouncementPriority::class)],
            'targetType' => ['sometimes', Rule::enum(AnnouncementTargetType::class)],
            'targetIds' => ['nullable', 'array'],
            'targetIds.*' => ['string'],
            'targetRole' => ['nullable', Rule::enum(UserRole::class)],
            'requiresVerifiedMembership' => ['sometimes', 'boolean'],
            'requiresAcknowledgement' => ['sometimes', 'boolean'],
            'scheduledAt' => ['nullable', 'date'],
            'expiresAt' => ['nullable', 'date'],
            'attachments' => ['nullable', 'array'],
        ];
    }

    public function payload(): array
    {
        $map = [
            'titleEn' => 'title_en',
            'titleAr' => 'title_ar',
            'bodyEn' => 'body_en',
            'bodyAr' => 'body_ar',
            'category' => 'category',
            'priority' => 'priority',
            'targetType' => 'target_type',
            'targetIds' => 'target_ids',
            'targetRole' => 'target_role',
            'scheduledAt' => 'scheduled_at',
            'expiresAt' => 'expires_at',
            'attachments' => 'attachments',
        ];

        $payload = [];

        foreach ($map as $requestKey => $column) {
            if ($this->has($requestKey)) {
                $payload[$column] = $this->input($requestKey);
            }
        }

        if ($this->has('requiresVerifiedMembership')) {
            $payload['requires_verified_membership'] = $this->boolean('requiresVerifiedMembership');
        }

        if ($this->has('requiresAcknowledgement')) {
            $payload['requires_acknowledgement'] = $this->boolean('requiresAcknowledgement');
        }

        return $payload;
    }
}
