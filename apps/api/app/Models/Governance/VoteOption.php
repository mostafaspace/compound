<?php

namespace App\Models\Governance;

use Database\Factories\Governance\VoteOptionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoteOption extends Model
{
    /** @use HasFactory<VoteOptionFactory> */
    use HasFactory;

    protected static function newFactory(): VoteOptionFactory
    {
        return VoteOptionFactory::new();
    }

    protected $fillable = [
        'vote_id',
        'label',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Vote, $this>
     */
    public function vote(): BelongsTo
    {
        return $this->belongsTo(Vote::class);
    }
}
