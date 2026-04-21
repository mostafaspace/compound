<?php

namespace App\Models\Finance;

use App\Models\Property\Unit;
use Database\Factories\Finance\UnitAccountFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnitAccount extends Model
{
    /** @use HasFactory<UnitAccountFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'unit_id',
        'balance',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return HasMany<LedgerEntry, $this>
     */
    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    /**
     * @return HasMany<PaymentSubmission, $this>
     */
    public function paymentSubmissions(): HasMany
    {
        return $this->hasMany(PaymentSubmission::class);
    }
}
