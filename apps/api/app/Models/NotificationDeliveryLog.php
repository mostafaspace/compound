<?php

namespace App\Models;

use App\Enums\DeliveryStatus;
use App\Enums\NotificationChannel;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationDeliveryLog extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'notification_id',
        'channel',
        'status',
        'recipient',
        'provider',
        'provider_response',
        'error_message',
        'attempt_number',
    ];

    protected $casts = [
        'channel' => NotificationChannel::class,
        'status' => DeliveryStatus::class,
        'provider_response' => 'array',
        'attempt_number' => 'integer',
    ];

    public function notification(): BelongsTo
    {
        return $this->belongsTo(Notification::class);
    }

    public function scopeByStatus($query, DeliveryStatus $status)
    {
        return $query->where('status', $status);
    }

    public function scopeRetryable($query)
    {
        return $query->where('status', DeliveryStatus::Failed->value);
    }
}
