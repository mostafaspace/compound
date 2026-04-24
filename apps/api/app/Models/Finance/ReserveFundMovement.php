<?php

namespace App\Models\Finance;

use App\Enums\ReserveFundMovementType;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReserveFundMovement extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'reserve_fund_id',
        'type',
        'amount',
        'description',
        'reference',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'type'   => ReserveFundMovementType::class,
        ];
    }

    /**
     * @return BelongsTo<ReserveFund, $this>
     */
    public function reserveFund(): BelongsTo
    {
        return $this->belongsTo(ReserveFund::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
