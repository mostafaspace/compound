<?php

namespace App\Models\Polls;

use App\Models\Property\Building;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Poll extends Model
{
    use HasUlids;

    protected $fillable = [
        'compound_id',
        'building_id',
        'poll_type_id',
        'title',
        'description',
        'status',
        'scope',
        'is_anonymous',
        'allow_multiple',
        'max_choices',
        'eligibility',
        'starts_at',
        'ends_at',
        'published_at',
        'closed_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_anonymous'   => 'boolean',
            'allow_multiple' => 'boolean',
            'starts_at'      => 'datetime',
            'ends_at'        => 'datetime',
            'published_at'   => 'datetime',
            'closed_at'      => 'datetime',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return BelongsTo<Building, $this> */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /** @return BelongsTo<PollType, $this> */
    public function pollType(): BelongsTo
    {
        return $this->belongsTo(PollType::class);
    }

    /** @return HasMany<PollOption, $this> */
    public function options(): HasMany
    {
        return $this->hasMany(PollOption::class)->orderBy('sort_order');
    }

    /** @return HasMany<PollVote, $this> */
    public function votes(): HasMany
    {
        return $this->hasMany(PollVote::class);
    }
}
