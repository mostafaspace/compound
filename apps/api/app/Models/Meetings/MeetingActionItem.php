<?php

namespace App\Models\Meetings;

use App\Models\User;
use Database\Factories\Meetings\MeetingActionItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingActionItem extends Model
{
    /** @use HasFactory<MeetingActionItemFactory> */
    use HasFactory;
    use HasUlids;

    protected static function newFactory(): MeetingActionItemFactory
    {
        return MeetingActionItemFactory::new();
    }

    protected $fillable = [
        'meeting_id',
        'title',
        'description',
        'assigned_to',
        'due_date',
        'status',
        'completed_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'due_date'     => 'date',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Meeting, $this> */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
