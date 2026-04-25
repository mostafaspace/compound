<?php

namespace App\Models\Meetings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingParticipant extends Model
{
    protected $fillable = [
        'meeting_id',
        'user_id',
        'invited_at',
        'rsvp_status',
        'attended',
        'attendance_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'invited_at'               => 'datetime',
            'attendance_confirmed_at'  => 'datetime',
            'attended'                 => 'boolean',
        ];
    }

    /** @return BelongsTo<Meeting, $this> */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
