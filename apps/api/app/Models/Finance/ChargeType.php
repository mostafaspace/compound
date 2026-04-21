<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChargeType extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'name',
        'code',
        'default_amount',
        'is_recurring',
    ];

    protected function casts(): array
    {
        return [
            'default_amount' => 'decimal:2',
            'is_recurring' => 'boolean',
        ];
    }

    /**
     * @return HasMany<RecurringCharge, $this>
     */
    public function recurringCharges(): HasMany
    {
        return $this->hasMany(RecurringCharge::class);
    }
}
