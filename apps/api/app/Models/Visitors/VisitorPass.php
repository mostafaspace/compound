<?php

namespace App\Models\Visitors;

use App\Enums\VisitorPassStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorPass extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'visitor_request_id',
        'token_hash',
        'status',
        'expires_at',
        'max_uses',
        'uses_count',
        'last_used_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'max_uses' => 'integer',
            'revoked_at' => 'datetime',
            'status' => VisitorPassStatus::class,
            'uses_count' => 'integer',
        ];
    }

    public function visitorRequest(): BelongsTo
    {
        return $this->belongsTo(VisitorRequest::class);
    }
}
