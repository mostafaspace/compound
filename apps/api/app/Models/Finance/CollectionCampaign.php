<?php

namespace App\Models\Finance;

use App\Enums\CampaignStatus;
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
        'description',
        'status',
        'target_amount',
        'target_type',
        'target_ids',
        'currency',
        'metadata',
        'started_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'target_ids' => 'array',
            'target_amount' => 'decimal:2',
            'status' => CampaignStatus::class,
            'started_at' => 'datetime',
            'closed_at' => 'datetime',
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
