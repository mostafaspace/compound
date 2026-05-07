<?php

namespace App\Models\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentViolationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentViolation extends Model
{
    /** @use HasFactory<ApartmentViolationFactory> */
    use HasFactory;

    protected $fillable = [
        'unit_id',
        'violation_rule_id',
        'applied_by',
        'fee',
        'notes',
        'status',
        'paid_at',
        'waived_reason',
    ];

    protected static function newFactory(): ApartmentViolationFactory
    {
        return ApartmentViolationFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'status' => ApartmentViolationStatus::class,
            'paid_at' => 'datetime',
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
     * @return BelongsTo<ViolationRule, $this>
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(ViolationRule::class, 'violation_rule_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function applier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }
}
