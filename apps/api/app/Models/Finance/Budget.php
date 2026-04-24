<?php

namespace App\Models\Finance;

use App\Enums\BudgetPeriodType;
use App\Enums\BudgetStatus;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Budget extends Model
{
    use HasFactory, HasUlids;

    protected $attributes = [
        'status' => 'draft',
    ];

    protected $fillable = [
        'compound_id',
        'name',
        'period_type',
        'period_year',
        'period_month',
        'status',
        'notes',
        'created_by',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'period_type'  => BudgetPeriodType::class,
            'period_year'  => 'integer',
            'period_month' => 'integer',
            'status'       => BudgetStatus::class,
            'closed_at'    => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<BudgetCategory, $this>
     */
    public function categories(): HasMany
    {
        return $this->hasMany(BudgetCategory::class);
    }

    public function totalPlanned(): string
    {
        return (string) $this->categories()->sum('planned_amount');
    }

    public function totalActual(): string
    {
        return (string) $this->categories()->sum('actual_amount');
    }
}
