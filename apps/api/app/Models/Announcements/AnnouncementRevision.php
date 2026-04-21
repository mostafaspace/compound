<?php

namespace App\Models\Announcements;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementRevision extends Model
{
    use HasUlids;

    protected $fillable = [
        'announcement_id',
        'revision',
        'changed_by',
        'snapshot',
        'change_summary',
    ];

    protected function casts(): array
    {
        return [
            'change_summary' => 'array',
            'revision' => 'integer',
            'snapshot' => 'array',
        ];
    }

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
