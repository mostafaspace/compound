<?php

namespace App\Models\Visitors;

use App\Enums\VisitorScanResult;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorScanLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'visitor_request_id',
        'visitor_pass_id',
        'scanned_by',
        'token_fingerprint',
        'result',
        'decision',
        'reason',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'metadata' => 'array',
            'result' => VisitorScanResult::class,
        ];
    }

    public function visitorRequest(): BelongsTo
    {
        return $this->belongsTo(VisitorRequest::class);
    }

    public function visitorPass(): BelongsTo
    {
        return $this->belongsTo(VisitorPass::class);
    }

    public function scanner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }
}
