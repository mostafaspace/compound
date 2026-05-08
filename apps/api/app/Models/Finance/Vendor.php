<?php

namespace App\Models\Finance;

use App\Enums\VendorType;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'compound_id',
        'name',
        'type',
        'contact_name',
        'phone',
        'email',
        'notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => VendorType::class,
            'is_active' => 'boolean',
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
     * @return HasMany<Expense, $this>
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
