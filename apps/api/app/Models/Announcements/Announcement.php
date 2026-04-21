<?php

namespace App\Models\Announcements;

use App\Enums\AnnouncementCategory;
use App\Enums\AnnouncementPriority;
use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementTargetType;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Announcement extends Model
{
    use HasFactory;
    use HasUlids;

    protected $fillable = [
        'created_by',
        'category',
        'priority',
        'status',
        'target_type',
        'target_ids',
        'target_role',
        'requires_verified_membership',
        'requires_acknowledgement',
        'title_en',
        'title_ar',
        'body_en',
        'body_ar',
        'attachments',
        'revision',
        'last_published_snapshot',
        'scheduled_at',
        'published_at',
        'expires_at',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'category' => AnnouncementCategory::class,
            'expires_at' => 'datetime',
            'last_published_snapshot' => 'array',
            'priority' => AnnouncementPriority::class,
            'published_at' => 'datetime',
            'requires_acknowledgement' => 'boolean',
            'requires_verified_membership' => 'boolean',
            'revision' => 'integer',
            'scheduled_at' => 'datetime',
            'status' => AnnouncementStatus::class,
            'target_ids' => 'array',
            'target_type' => AnnouncementTargetType::class,
            'archived_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function acknowledgements(): HasMany
    {
        return $this->hasMany(AnnouncementAcknowledgement::class);
    }

    public function uploadedAttachments(): HasMany
    {
        return $this->hasMany(AnnouncementAttachment::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(AnnouncementRevision::class);
    }

    public function isPublishedForFeed(): bool
    {
        if ($this->status === AnnouncementStatus::Archived || $this->archived_at !== null) {
            return false;
        }

        if ($this->status !== AnnouncementStatus::Published) {
            return false;
        }

        if ($this->scheduled_at !== null && $this->scheduled_at->isFuture()) {
            return false;
        }

        return $this->expires_at === null || $this->expires_at->isFuture();
    }

    public function effectiveStatus(): AnnouncementStatus
    {
        if ($this->status === AnnouncementStatus::Archived || $this->archived_at !== null) {
            return AnnouncementStatus::Archived;
        }

        if (
            $this->status === AnnouncementStatus::Published
            && $this->expires_at !== null
            && $this->expires_at->isPast()
        ) {
            return AnnouncementStatus::Expired;
        }

        return $this->status;
    }
}
