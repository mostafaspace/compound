<?php

namespace App\Models\Property;

use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentNote;
use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Apartments\ApartmentPenaltyEvent;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Finance\UnitAccount;
use App\Models\User;
use Database\Factories\Property\UnitFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'compound_id',
        'building_id',
        'floor_id',
        'unit_number',
        'type',
        'area_sqm',
        'bedrooms',
        'status',
        'has_vehicle',
        'has_parking',
        'metadata',
        'archived_at',
        'archived_by',
        'archive_reason',
    ];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
            'area_sqm' => 'decimal:2',
            'bedrooms' => 'integer',
            'metadata' => 'array',
            'status' => UnitStatus::class,
            'type' => UnitType::class,
            'has_vehicle' => 'boolean',
            'has_parking' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Compound, $this>
     */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /**
     * @return BelongsTo<Building, $this>
     */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /**
     * @return BelongsTo<Floor, $this>
     */
    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    /**
     * @return HasMany<ApartmentResident, $this>
     */
    public function apartmentResidents(): HasMany
    {
        return $this->hasMany(ApartmentResident::class);
    }

    /**
     * @return HasMany<ApartmentVehicle, $this>
     */
    public function apartmentVehicles(): HasMany
    {
        return $this->hasMany(ApartmentVehicle::class);
    }

    /**
     * @return HasMany<ApartmentParkingSpot, $this>
     */
    public function apartmentParkingSpots(): HasMany
    {
        return $this->hasMany(ApartmentParkingSpot::class);
    }

    /**
     * @return HasMany<ApartmentNote, $this>
     */
    public function apartmentNotes(): HasMany
    {
        return $this->hasMany(ApartmentNote::class);
    }

    /**
     * @return HasMany<ApartmentViolation, $this>
     */
    public function apartmentViolations(): HasMany
    {
        return $this->hasMany(ApartmentViolation::class);
    }

    /**
     * @return HasMany<ApartmentDocument, $this>
     */
    public function apartmentDocuments(): HasMany
    {
        return $this->hasMany(ApartmentDocument::class);
    }

    /**
     * @return HasOne<UnitAccount, $this>
     */
    public function unitAccount(): HasOne
    {
        return $this->hasOne(UnitAccount::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'apartment_residents')
            ->withPivot(['relation_type', 'starts_at', 'ends_at', 'is_primary', 'verification_status'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<ApartmentPenaltyEvent, $this>
     */
    public function apartmentPenaltyEvents(): HasMany
    {
        return $this->hasMany(ApartmentPenaltyEvent::class);
    }

    /**
     * Sum of non-voided, non-expired penalty points for this unit.
     */
    public function activePenaltyPoints(): int
    {
        return (int) $this->apartmentPenaltyEvents()
            ->whereNull('voided_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->sum('points');
    }
}
