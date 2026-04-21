<?php

namespace App\Models\Property;

use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Models\User;
use Database\Factories\Property\UnitFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'compound_id',
        'building_id',
        'floor_id',
        'unit_number',
        'type',
        'area_sqm',
        'bedrooms',
        'status',
        'metadata',
        'archived_at',
        'archived_by',
        'archive_reason',
    ];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
            'area_sqm' => 'decimal:2',
            'bedrooms' => 'integer',
            'metadata' => 'array',
            'status' => UnitStatus::class,
            'type' => UnitType::class,
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
     * @return BelongsTo<Floor, $this>
     */
    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    /**
     * @return HasMany<UnitMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(UnitMembership::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'unit_memberships')
            ->withPivot(['relation_type', 'starts_at', 'ends_at', 'is_primary', 'verification_status'])
            ->withTimestamps();
    }
}
