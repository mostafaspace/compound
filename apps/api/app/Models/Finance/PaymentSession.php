<?php

namespace App\Models\Finance;

use App\Enums\PaymentSessionStatus;
use App\Models\User;
use Database\Factories\Finance\PaymentSessionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentSession extends Model
{
    /** @use HasFactory<PaymentSessionFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'unit_account_id',
        'initiated_by',
        'provider',
        'provider_session_id',
        'amount',
        'currency',
        'status',
        'return_url',
        'provider_metadata',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'            => 'decimal:2',
            'provider_metadata' => 'array',
            'expires_at'        => 'datetime',
            'status'            => PaymentSessionStatus::class,
        ];
    }

    /**
     * @return BelongsTo<UnitAccount, $this>
     */
    public function unitAccount(): BelongsTo
    {
        return $this->belongsTo(UnitAccount::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function initiatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }

    /**
     * @return HasMany<GatewayTransaction, $this>
     */
    public function gatewayTransactions(): HasMany
    {
        return $this->hasMany(GatewayTransaction::class);
    }
}
