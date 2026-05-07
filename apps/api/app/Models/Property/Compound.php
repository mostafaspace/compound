<?php

namespace App\Models\Property;

use App\Enums\CompoundStatus;
use App\Models\Apartments\ViolationRule;
use Database\Factories\Property\CompoundFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Compound extends Model
{
    /** @use HasFactory<CompoundFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'name',
        'legal_name',
        'code',
        'timezone',
        'currency',
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
            'metadata' => 'array',
            'status' => CompoundStatus::class,
        ];
    }

    /**
     * @return HasMany<Building, $this>
     */
    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class);
    }

    /**
     * @return HasMany<Unit, $this>
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    /**
     * @return HasMany<ViolationRule, $this>
     */
    public function violationRules(): HasMany
    {
        return $this->hasMany(ViolationRule::class);
    }
}
