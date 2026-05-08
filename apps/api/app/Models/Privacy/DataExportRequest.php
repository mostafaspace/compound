<?php

namespace App\Models\Privacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// CM-84 / CM-121: Data export request (right to portability)
class DataExportRequest extends Model
{
    use HasUlids;

    protected $fillable = [
        'requested_by',
        'user_id',
        'status',
        'modules',
        'package_path',
        'expires_at',
        'processed_at',
        'processed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'modules' => 'array',
            'expires_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** @return BelongsTo<User, $this> */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
