<?php

namespace App\Models\Polls;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PollVote extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'poll_id',
        'user_id',
        'voted_at',
    ];

    protected function casts(): array
    {
        return [
            'voted_at' => 'datetime',
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

    /** @return BelongsToMany<PollOption, $this> */
    public function options(): BelongsToMany
    {
        return $this->belongsToMany(PollOption::class, 'poll_vote_options', 'poll_vote_id', 'poll_option_id');
    }
}
