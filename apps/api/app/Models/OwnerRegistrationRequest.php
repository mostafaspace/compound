<?php

namespace App\Models;

use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'compound_id',
    'building_id',
    'unit_id',
    'user_id',
    'full_name_arabic',
    'phone',
    'email',
    'apartment_code',
    'status',
    'owner_acknowledged',
    'device_id',
    'request_token_hash',
    'password_setup_token',
    'password_setup_expires_at',
    'decision_reason',
    'reviewed_by',
    'reviewed_at',
    'metadata',
])]
class OwnerRegistrationRequest extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'owner_acknowledged' => 'boolean',
            'password_setup_expires_at' => 'datetime',
            'reviewed_at' => 'datetime',
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
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * @return HasMany<OwnerRegistrationDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(OwnerRegistrationDocument::class);
    }
}
