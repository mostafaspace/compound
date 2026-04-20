<?php

namespace App\Models\Visitors;

use App\Enums\VisitorRequestStatus;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VisitorRequest extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'host_user_id',
        'unit_id',
        'visitor_name',
        'visitor_phone',
        'vehicle_plate',
        'visit_starts_at',
        'visit_ends_at',
        'notes',
        'status',
        'arrived_at',
        'allowed_at',
        'denied_at',
        'completed_at',
        'cancelled_at',
        'decision_reason',
    ];

    protected function casts(): array
    {
        return [
            'arrived_at' => 'datetime',
            'allowed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
            'denied_at' => 'datetime',
            'status' => VisitorRequestStatus::class,
            'visit_ends_at' => 'datetime',
            'visit_starts_at' => 'datetime',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function pass(): HasOne
    {
        return $this->hasOne(VisitorPass::class);
    }

    public function scanLogs(): HasMany
    {
        return $this->hasMany(VisitorScanLog::class);
    }

    public function eventLogs(): HasMany
    {
        return $this->hasMany(VisitorEventLog::class);
    }
}
