<?php

namespace App\Models\Finance;

use App\Enums\ChargeFrequency;
use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Finance\RecurringChargeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringCharge extends Model
{
    /** @use HasFactory<RecurringChargeFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'compound_id',
        'charge_type_id',
        'name',
        'amount',
        'currency',
        'frequency',
        'billing_day',
        'target_type',
        'target_ids',
        'starts_at',
        'ends_at',
        'is_active',
        'last_run_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'frequency' => ChargeFrequency::class,
            'target_ids' => 'array',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'last_run_at' => 'datetime',
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
     * @return BelongsTo<ChargeType, $this>
     */
    public function chargeType(): BelongsTo
    {
        return $this->belongsTo(ChargeType::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
