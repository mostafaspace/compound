<?php

namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentParkingSpotFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApartmentParkingSpot extends Model
{
    /** @use HasFactory<ApartmentParkingSpotFactory> */
    use HasFactory;

    use SoftDeletes;

    protected static function newFactory(): ApartmentParkingSpotFactory
    {
        return ApartmentParkingSpotFactory::new();
    }

    protected $fillable = [
        'unit_id',
        'code',
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
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
