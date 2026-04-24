<?php

namespace App\Models\Finance;

use App\Enums\ExpenseApprovalAction;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseApproval extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'expense_id',
        'actor_id',
        'action',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'action' => ExpenseApprovalAction::class,
        ];
    }

    /**
     * @return BelongsTo<Expense, $this>
     */
    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
