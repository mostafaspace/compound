<?php

namespace App\Models\Visitors;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorEventLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'visitor_request_id',
        'actor_id',
        'event_type',
        'from_status',
        'to_status',
        'reason',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function visitorRequest(): BelongsTo
    {
        return $this->belongsTo(VisitorRequest::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
