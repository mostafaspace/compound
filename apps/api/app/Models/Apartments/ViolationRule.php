<?php

namespace App\Models\Apartments;

use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Apartments\ViolationRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ViolationRule extends Model
{
    /** @use HasFactory<ViolationRuleFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'compound_id',
        'name',
        'name_ar',
        'description',
        'default_fee',
        'default_points',
        'is_active',
        'created_by',
    ];

    protected static function newFactory(): ViolationRuleFactory
    {
        return ViolationRuleFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active'      => 'boolean',
            'default_fee'    => 'decimal:2',
            'default_points' => 'integer',
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
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
