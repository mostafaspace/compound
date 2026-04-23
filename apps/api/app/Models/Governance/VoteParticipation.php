<?php

namespace App\Models\Governance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoteParticipation extends Model
{
    protected $fillable = [
        'vote_id',
        'user_id',
        'option_id',
        'eligibility_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'eligibility_snapshot' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Vote, $this>
     */
    public function vote(): BelongsTo
    {
        return $this->belongsTo(Vote::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<VoteOption, $this>
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(VoteOption::class);
    }
}
