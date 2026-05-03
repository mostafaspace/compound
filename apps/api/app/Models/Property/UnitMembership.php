<?php

namespace App\Models\Property;

use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\VerificationStatus;
use App\Models\User;
use Database\Factories\Property\UnitMembershipFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnitMembership extends Model
{
    /** @use HasFactory<UnitMembershipFactory> */
    use HasFactory;

    protected static function newFactory(): UnitMembershipFactory
    {
        return UnitMembershipFactory::new();
    }

    protected $fillable = [
        'unit_id',
        'user_id',
        'relation_type',
        'starts_at',
        'ends_at',
        'is_primary',
        'verification_status',
        'created_by',
        'resident_name',
        'resident_phone',
        'phone_public',
        'resident_email',
        'email_public',
        'has_vehicle',
        'vehicle_plate',
        'parking_spot_code',
        'garage_sticker_code',
    ];

    protected function casts(): array
    {
        return [
            'ends_at' => 'date',
            'is_primary' => 'boolean',
            'relation_type' => UnitRelationType::class,
            'starts_at' => 'date',
            'verification_status' => VerificationStatus::class,
            'phone_public' => 'boolean',
            'email_public' => 'boolean',
            'has_vehicle' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param  Builder<UnitMembership>  $query
     * @return Builder<UnitMembership>
     */
    public function scopeActive(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query
            ->where(function (Builder $query) use ($today): void {
                $query->whereNull('starts_at')->orWhereDate('starts_at', '<=', $today);
            })
            ->where(function (Builder $query) use ($today): void {
                $query->whereNull('ends_at')->orWhereDate('ends_at', '>=', $today);
            });
    }

    /**
     * @param  Builder<UnitMembership>  $query
     * @return Builder<UnitMembership>
     */
    public function scopeActiveForAccess(Builder $query): Builder
    {
        return $query
            ->active()
            ->where('verification_status', VerificationStatus::Verified->value)
            ->whereHas('unit', function (Builder $query): void {
                $query
                    ->whereNull('archived_at')
                    ->where('status', '!=', UnitStatus::Archived->value);
            });
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
