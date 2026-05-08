<?php

namespace App\Models\Security;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityShiftAssignment extends Model
{
    protected $fillable = [
        'shift_id',
        'gate_id',
        'guard_user_id',
        'checked_in_at',
        'checked_out_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<SecurityShift, $this> */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(SecurityShift::class, 'shift_id');
    }

    /** @return BelongsTo<SecurityGate, $this> */
    public function gate(): BelongsTo
    {
        return $this->belongsTo(SecurityGate::class, 'gate_id');
    }

    /** @return BelongsTo<User, $this> */
    public function guardUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guard_user_id');
    }
}
