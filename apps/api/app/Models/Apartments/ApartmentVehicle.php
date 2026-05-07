<?php

namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentVehicleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApartmentVehicle extends Model
{
    /** @use HasFactory<ApartmentVehicleFactory> */
    use HasFactory;

    use SoftDeletes;

    protected static function newFactory(): ApartmentVehicleFactory
    {
        return ApartmentVehicleFactory::new();
    }

    protected $fillable = [
        'unit_id',
        'apartment_resident_id',
        'plate',
        'make',
        'model',
        'color',
        'sticker_code',
        'notes',
        'created_by',
    ];

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<ApartmentResident, $this>
     */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(ApartmentResident::class, 'apartment_resident_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
