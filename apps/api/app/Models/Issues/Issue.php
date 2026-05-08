<?php

namespace App\Models\Issues;

use App\Models\Compound;
use App\Models\Property\Building;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Issues\IssueFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Issue extends Model
{
    /** @use HasFactory<IssueFactory> */
    use HasFactory;

    use HasUlids;

    protected static function newFactory(): IssueFactory
    {
        return IssueFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'building_id',
        'unit_id',
        'reported_by',
        'assigned_to',
        'category',
        'title',
        'description',
        'status',
        'priority',
        'resolved_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
            'metadata' => 'array',
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
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return HasMany<IssueComment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(IssueComment::class);
    }

    /**
     * @return HasMany<IssueAttachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(IssueAttachment::class);
    }
}
