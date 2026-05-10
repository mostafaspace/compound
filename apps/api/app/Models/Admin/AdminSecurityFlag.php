<?php

namespace App\Models\Admin;

use App\Models\User;
use Database\Factories\Admin\AdminSecurityFlagFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminSecurityFlag extends Model
{
    /** @use HasFactory<AdminSecurityFlagFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'admin_session_id',
        'type',
        'severity',
        'status',
        'summary',
        'metadata',
        'reviewed_by',
        'reviewed_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'metadata'    => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    protected static function newFactory(): AdminSecurityFlagFactory
    {
        return AdminSecurityFlagFactory::new();
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<AdminSession, $this> */
    public function adminSession(): BelongsTo
    {
        return $this->belongsTo(AdminSession::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
