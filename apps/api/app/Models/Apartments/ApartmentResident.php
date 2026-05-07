<?php

namespace App\Models\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\VerificationStatus;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentResidentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApartmentResident extends Model
{
    /** @use HasFactory<ApartmentResidentFactory> */
    use HasFactory;
    use SoftDeletes;

    protected static function newFactory(): ApartmentResidentFactory
    {
        return ApartmentResidentFactory::new();
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
        'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_primary' => 'boolean',
            'phone_public' => 'boolean',
            'email_public' => 'boolean',
            'relation_type' => UnitRelationType::class,
            'verification_status' => VerificationStatus::class,
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
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @param  Builder<ApartmentResident>  $query
     * @return Builder<ApartmentResident>
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
     * @param  Builder<ApartmentResident>  $query
     * @return Builder<ApartmentResident>
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
}
