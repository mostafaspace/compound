<?php

namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentNote extends Model
{
    /** @use HasFactory<ApartmentNoteFactory> */
    use HasFactory;

    protected $fillable = [
        'unit_id',
        'author_id',
        'body',
    ];

    protected static function newFactory(): ApartmentNoteFactory
    {
        return ApartmentNoteFactory::new();
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
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
