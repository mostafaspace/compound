<?php

namespace App\Models\Apartments;

use App\Models\User;
use Database\Factories\Apartments\VehicleNotificationRecipientFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleNotificationRecipient extends Model
{
    /** @use HasFactory<VehicleNotificationRecipientFactory> */
    use HasFactory;

    protected static function newFactory(): VehicleNotificationRecipientFactory
    {
        return VehicleNotificationRecipientFactory::new();
    }

    protected $fillable = [
        'vehicle_notification_id',
        'user_id',
        'read_at',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<VehicleNotification, $this>
     */
    public function notification(): BelongsTo
    {
        return $this->belongsTo(VehicleNotification::class, 'vehicle_notification_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
