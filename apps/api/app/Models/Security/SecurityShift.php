<?php

namespace App\Models\Security;

use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Security\SecurityShiftFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SecurityShift extends Model
{
    /** @use HasFactory<SecurityShiftFactory> */
    use HasFactory;
    use HasUlids;

    protected static function newFactory(): SecurityShiftFactory
    {
        return SecurityShiftFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'name',
        'status',
        'handover_notes',
        'started_at',
        'ended_at',
        'created_by',
        'closed_by',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at'   => 'datetime',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /** @return HasMany<SecurityShiftAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(SecurityShiftAssignment::class, 'shift_id');
    }

    /** @return HasMany<SecurityIncident, $this> */
    public function incidents(): HasMany
    {
        return $this->hasMany(SecurityIncident::class, 'shift_id');
    }

    /** @return HasMany<ManualVisitorEntry, $this> */
    public function manualEntries(): HasMany
    {
        return $this->hasMany(ManualVisitorEntry::class, 'shift_id');
    }
}
