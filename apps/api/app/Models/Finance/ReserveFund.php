<?php

namespace App\Models\Finance;

use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReserveFund extends Model
{
    use HasFactory, HasUlids;

    protected $attributes = [
        'balance' => '0.00',
        'currency' => 'EGP',
        'is_active' => true,
    ];

    protected $fillable = [
        'compound_id',
        'name',
        'description',
        'balance',
        'currency',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
            'is_active' => 'boolean',
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
     * @return HasMany<ReserveFundMovement, $this>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(ReserveFundMovement::class);
    }
}
