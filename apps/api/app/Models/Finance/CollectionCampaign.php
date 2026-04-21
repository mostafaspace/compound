<?php

namespace App\Models\Finance;

use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionCampaign extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'compound_id',
        'name',
        'status',
        'target_amount',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'target_amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Compound, $this>
     */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }
}
