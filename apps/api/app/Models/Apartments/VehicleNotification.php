<?php

namespace App\Models\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\VehicleNotificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleNotification extends Model
{
    /** @use HasFactory<VehicleNotificationFactory> */
    use HasFactory;

    protected static function newFactory(): VehicleNotificationFactory
    {
        return VehicleNotificationFactory::new();
    }

    protected $fillable = [
        'sender_user_id',
        'sender_unit_id',
        'sender_mode',
        'sender_alias',
        'target_vehicle_id',
        'target_unit_id',
        'target_plate_query',
        'message',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'sender_mode' => VehicleNotificationSenderMode::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function senderUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'sender_unit_id');
    }

    /**
     * @return BelongsTo<ApartmentVehicle, $this>
     */
    public function targetVehicle(): BelongsTo
    {
        return $this->belongsTo(ApartmentVehicle::class, 'target_vehicle_id');
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function targetUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'target_unit_id');
    }

    /**
     * @return HasMany<VehicleNotificationRecipient, $this>
     */
    public function recipients(): HasMany
    {
        return $this->hasMany(VehicleNotificationRecipient::class);
    }
}
