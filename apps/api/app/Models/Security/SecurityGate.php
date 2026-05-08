<?php

namespace App\Models\Security;

use App\Models\Property\Building;
use App\Models\Property\Compound;
use Database\Factories\Security\SecurityGateFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SecurityGate extends Model
{
    /** @use HasFactory<SecurityGateFactory> */
    use HasFactory;

    use HasUlids;

    protected static function newFactory(): SecurityGateFactory
    {
        return SecurityGateFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'building_id',
        'name',
        'zone',
        'description',
        'is_active',
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

    /** @return BelongsTo<Building, $this> */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /** @return HasMany<SecurityIncident, $this> */
    public function incidents(): HasMany
    {
        return $this->hasMany(SecurityIncident::class, 'gate_id');
    }

    /** @return HasMany<ManualVisitorEntry, $this> */
    public function manualEntries(): HasMany
    {
        return $this->hasMany(ManualVisitorEntry::class, 'gate_id');
    }
}
