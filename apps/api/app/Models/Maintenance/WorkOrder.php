<?php

namespace App\Models\Maintenance;

use App\Models\Finance\Expense;
use App\Models\Finance\Vendor;
use App\Models\Issues\Issue;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Maintenance\WorkOrderFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// CM-83 / CM-118: Maintenance work orders
class WorkOrder extends Model
{
    /** @use HasFactory<WorkOrderFactory> */
    use HasFactory;
    use HasUlids;

    protected static function newFactory(): WorkOrderFactory
    {
        return WorkOrderFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'issue_id',
        'vendor_id',
        'building_id',
        'unit_id',
        'title',
        'description',
        'category',
        'priority',
        'status',
        'estimated_cost',
        'approved_cost',
        'actual_cost',
        'expense_id',
        'created_by',
        'assigned_to',
        'approved_by',
        'cancelled_by',
        'target_completion_at',
        'scheduled_at',
        'started_at',
        'completed_at',
        'approved_at',
        'cancelled_at',
        'completion_notes',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'target_completion_at' => 'datetime',
            'scheduled_at'         => 'datetime',
            'started_at'           => 'datetime',
            'completed_at'         => 'datetime',
            'approved_at'          => 'datetime',
            'cancelled_at'         => 'datetime',
            'estimated_cost'       => 'decimal:2',
            'approved_cost'        => 'decimal:2',
            'actual_cost'          => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return BelongsTo<Issue, $this> */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    /** @return BelongsTo<Vendor, $this> */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /** @return BelongsTo<Building, $this> */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<Expense, $this> */
    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** @return BelongsTo<User, $this> */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** @return BelongsTo<User, $this> */
    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /** @return HasMany<WorkOrderEstimate, $this> */
    public function estimates(): HasMany
    {
        return $this->hasMany(WorkOrderEstimate::class);
    }
}
