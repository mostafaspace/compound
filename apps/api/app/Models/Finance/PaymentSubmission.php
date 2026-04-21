<?php

namespace App\Models\Finance;

use App\Enums\PaymentStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentSubmission extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'unit_account_id',
        'submitted_by',
        'amount',
        'currency',
        'method',
        'reference',
        'proof_path',
        'status',
        'notes',
        'metadata',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'metadata' => 'array',
            'reviewed_at' => 'datetime',
            'status' => PaymentStatus::class,
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
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
