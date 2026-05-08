<?php

namespace App\Models\Security;

use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Security\SecurityIncidentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityIncident extends Model
{
    /** @use HasFactory<SecurityIncidentFactory> */
    use HasFactory;

    use HasUlids;

    protected static function newFactory(): SecurityIncidentFactory
    {
        return SecurityIncidentFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'gate_id',
        'shift_id',
        'reported_by',
        'type',
        'title',
        'description',
        'notes',
        'metadata',
        'occurred_at',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'occurred_at' => 'datetime',
            'resolved_at' => 'datetime',
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
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
