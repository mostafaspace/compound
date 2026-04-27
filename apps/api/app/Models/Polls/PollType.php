<?php

namespace App\Models\Polls;

use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PollType extends Model
{
    use HasUlids;

    protected $fillable = [
        'compound_id',
        'name',
        'description',
        'color',
        'is_active',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return HasMany<Poll, $this> */
    public function polls(): HasMany
    {
        return $this->hasMany(Poll::class);
    }
}
