<?php

namespace App\Models\Meetings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingAgendaItem extends Model
{
    protected $fillable = [
        'meeting_id',
        'position',
        'title',
        'description',
        'duration_minutes',
        'presenter_user_id',
        'linked_type',
        'linked_id',
    ];

    /** @return BelongsTo<Meeting, $this> */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /** @return BelongsTo<User, $this> */
    public function presenter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'presenter_user_id');
    }
}
