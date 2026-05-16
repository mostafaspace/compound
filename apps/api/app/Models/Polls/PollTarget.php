<?php

namespace App\Models\Polls;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PollTarget extends Model
{
    protected $fillable = [
        'poll_id',
        'target_type',
        'target_id',
    ];

    /** @return BelongsTo<Poll, $this> */
    public function poll(): BelongsTo
    {
        return $this->belongsTo(Poll::class);
    }
}
