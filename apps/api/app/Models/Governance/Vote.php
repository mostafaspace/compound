<?php

namespace App\Models\Governance;

use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Governance\VoteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vote extends Model
{
    /** @use HasFactory<VoteFactory> */
    use HasFactory;

    use HasUlids;

    protected static function newFactory(): VoteFactory
    {
        return VoteFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'building_id',
        'type',
        'title',
        'description',
        'status',
        'scope',
        'eligibility',
        'requires_doc_compliance',
        'is_anonymous',
        'starts_at',
        'ends_at',
        'created_by',
        'result_applied_at',
    ];

    protected function casts(): array
    {
        return [
            'requires_doc_compliance' => 'boolean',
            'is_anonymous' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'result_applied_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Compound, $this>
     */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /**
     * @return BelongsTo<Building, $this>
     */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<VoteOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(VoteOption::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<VoteParticipation, $this>
     */
    public function participations(): HasMany
    {
        return $this->hasMany(VoteParticipation::class);
    }
}
