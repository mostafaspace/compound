<?php

namespace App\Models\Security;

use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Security\ManualVisitorEntryFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManualVisitorEntry extends Model
{
    /** @use HasFactory<ManualVisitorEntryFactory> */
    use HasFactory;
    use HasUlids;

    protected static function newFactory(): ManualVisitorEntryFactory
    {
        return ManualVisitorEntryFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'gate_id',
        'shift_id',
        'processed_by',
        'visitor_name',
        'visitor_phone',
        'vehicle_plate',
        'host_user_id',
        'host_unit_id',
        'reason',
        'notes',
        'status',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return BelongsTo<SecurityGate, $this> */
    public function gate(): BelongsTo
    {
        return $this->belongsTo(SecurityGate::class, 'gate_id');
    }

    /** @return BelongsTo<SecurityShift, $this> */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(SecurityShift::class, 'shift_id');
    }

    /** @return BelongsTo<User, $this> */
    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /** @return BelongsTo<User, $this> */
    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    /** @return BelongsTo<Unit, $this> */
    public function hostUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'host_unit_id');
    }
}
