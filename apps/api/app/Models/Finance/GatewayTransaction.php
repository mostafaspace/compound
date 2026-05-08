<?php

namespace App\Models\Finance;

use App\Enums\GatewayTransactionStatus;
use Database\Factories\Finance\GatewayTransactionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GatewayTransaction extends Model
{
    /** @use HasFactory<GatewayTransactionFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'payment_session_id',
        'provider',
        'provider_transaction_id',
        'event_type',
        'status',
        'amount',
        'currency',
        'payment_submission_id',
        'raw_payload',
        'processed',
        'processing_error',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'raw_payload' => 'array',
            'processed' => 'boolean',
            'status' => GatewayTransactionStatus::class,
        ];
    }

    /**
     * @return BelongsTo<PaymentSession, $this>
     */
    public function paymentSession(): BelongsTo
    {
        return $this->belongsTo(PaymentSession::class);
    }

    /**
     * @return BelongsTo<PaymentSubmission, $this>
     */
    public function paymentSubmission(): BelongsTo
    {
        return $this->belongsTo(PaymentSubmission::class);
    }
}
