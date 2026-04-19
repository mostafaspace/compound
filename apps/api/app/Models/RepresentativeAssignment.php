<?php

namespace App\Models;

use App\Enums\ContactVisibility;
use App\Enums\RepresentativeRole;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RepresentativeAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'compound_id',
        'building_id',
        'floor_id',
        'user_id',
        'role',
        'starts_at',
        'ends_at',
        'is_active',
        'contact_visibility',
        'appointed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'role' => RepresentativeRole::class,
            'contact_visibility' => ContactVisibility::class,
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_active' => 'boolean',
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

    /** @return BelongsTo<Floor, $this> */
    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function appointedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'appointed_by');
    }

    /** @param Builder<RepresentativeAssignment> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true)->whereNull('ends_at');
    }

    /** @param Builder<RepresentativeAssignment> $query */
    public function scopeForCompound(Builder $query, string $compoundId): void
    {
        $query->where('compound_id', $compoundId);
    }

    /** @param Builder<RepresentativeAssignment> $query */
    public function scopeForBuilding(Builder $query, string $buildingId): void
    {
        $query->where('building_id', $buildingId);
    }

    /** @param Builder<RepresentativeAssignment> $query */
    public function scopeForFloor(Builder $query, string $floorId): void
    {
        $query->where('floor_id', $floorId);
    }
}
