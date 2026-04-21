<?php

namespace App\Http\Requests\Announcements;

use App\Enums\AnnouncementCategory;
use App\Enums\AnnouncementPriority;
use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementTargetType;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'titleEn' => ['required', 'string', 'max:255'],
            'titleAr' => ['required', 'string', 'max:255'],
            'bodyEn' => ['required', 'string', 'max:10000'],
            'bodyAr' => ['required', 'string', 'max:10000'],
            'category' => ['required', Rule::enum(AnnouncementCategory::class)],
            'priority' => ['sometimes', Rule::enum(AnnouncementPriority::class)],
            'targetType' => ['required', Rule::enum(AnnouncementTargetType::class)],
            'targetIds' => ['nullable', 'array'],
            'targetIds.*' => ['string'],
            'targetRole' => ['nullable', Rule::enum(UserRole::class)],
            'requiresVerifiedMembership' => ['sometimes', 'boolean'],
            'requiresAcknowledgement' => ['sometimes', 'boolean'],
            'scheduledAt' => ['nullable', 'date'],
            'expiresAt' => ['nullable', 'date', 'after:scheduledAt'],
            'attachments' => ['nullable', 'array'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $targetType = $this->input('targetType');

            if ($targetType === AnnouncementTargetType::Role->value && ! $this->filled('targetRole')) {
                $validator->errors()->add('targetRole', 'A target role is required for role-targeted announcements.');
            }

            if (
                in_array($targetType, [
                    AnnouncementTargetType::Compound->value,
                    AnnouncementTargetType::Building->value,
                    AnnouncementTargetType::Floor->value,
                    AnnouncementTargetType::Unit->value,
                ], true)
                && empty($this->input('targetIds', []))
            ) {
                $validator->errors()->add('targetIds', 'At least one target id is required for property-scoped announcements.');
            }
        });
    }

    public function payload(): array
    {
        return [
            'created_by' => $this->user()?->id,
            'title_en' => $this->string('titleEn')->toString(),
            'title_ar' => $this->string('titleAr')->toString(),
            'body_en' => $this->string('bodyEn')->toString(),
            'body_ar' => $this->string('bodyAr')->toString(),
            'category' => $this->input('category'),
            'priority' => $this->input('priority', AnnouncementPriority::Normal->value),
            'status' => AnnouncementStatus::Draft->value,
            'target_type' => $this->input('targetType'),
            'target_ids' => $this->input('targetIds'),
            'target_role' => $this->input('targetRole'),
            'requires_verified_membership' => $this->boolean('requiresVerifiedMembership'),
            'requires_acknowledgement' => $this->boolean('requiresAcknowledgement'),
            'scheduled_at' => $this->input('scheduledAt'),
            'expires_at' => $this->input('expiresAt'),
            'attachments' => $this->input('attachments'),
        ];
    }
}
