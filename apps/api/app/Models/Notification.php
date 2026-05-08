<?php

namespace App\Models;

use App\Enums\NotificationCategory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'category',
        'channel',
        'priority',
        'title',
        'body',
        'metadata',
        'read_at',
        'archived_at',
        'delivered_at',
        'delivery_attempts',
        'last_delivery_error',
    ];

    protected $casts = [
        'category' => NotificationCategory::class,
        'metadata' => 'array',
        'read_at' => 'datetime',
        'archived_at' => 'datetime',
        'delivered_at' => 'datetime',
        'delivery_attempts' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    public function scopeNotArchived($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeByCategory($query, NotificationCategory $category)
    {
        return $query->where('category', $category);
    }

    public function scopeRecent($query)
    {
        return $query->orderByDesc('created_at');
    }
}
