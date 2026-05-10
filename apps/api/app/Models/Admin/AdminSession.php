<?php

namespace App\Models\Admin;

use App\Models\User;
use Database\Factories\Admin\AdminSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminSession extends Model
{
    /** @use HasFactory<AdminSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token_id',
        'ip_address',
        'user_agent',
        'device_label',
        'device_fingerprint_hash',
        'country',
        'city',
        'first_seen_at',
        'last_seen_at',
        'revoked_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at'  => 'datetime',
            'revoked_at'    => 'datetime',
        ];
    }

    protected static function newFactory(): AdminSessionFactory
    {
        return AdminSessionFactory::new();
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<AdminSecurityFlag, $this> */
    public function securityFlags(): HasMany
    {
        return $this->hasMany(AdminSecurityFlag::class);
    }
}
