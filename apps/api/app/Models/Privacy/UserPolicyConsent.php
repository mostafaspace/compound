<?php

namespace App\Models\Privacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// CM-84 / CM-121: User consent to policy versions
class UserPolicyConsent extends Model
{
    protected $fillable = [
        'user_id',
        'policy_type',
        'policy_version',
        'accepted_at',
        'ip_address',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
