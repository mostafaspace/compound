<?php

namespace App\Models\Polls;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PollNotificationLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'poll_id',
        'user_id',
        'notified_at',
        'channel',
        'delivered',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'notified_at' => 'datetime',
            'delivered_at' => 'datetime',
            'delivered' => 'boolean',
        ];
    }

    /** @return BelongsTo<Poll, $this> */
    public function poll(): BelongsTo
    {
        return $this->belongsTo(Poll::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
