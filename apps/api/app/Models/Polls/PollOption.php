<?php

namespace App\Models\Polls;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PollOption extends Model
{
    protected $fillable = [
        'poll_id',
        'label',
        'sort_order',
        'votes_count',
    ];

    /** @return BelongsTo<Poll, $this> */
    public function poll(): BelongsTo
    {
        return $this->belongsTo(Poll::class);
    }

    /** @return BelongsToMany<PollVote, $this> */
    public function pollVotes(): BelongsToMany
    {
        return $this->belongsToMany(PollVote::class, 'poll_vote_options', 'poll_option_id', 'poll_vote_id');
    }
}
