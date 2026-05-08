<?php

namespace App\Models\Import;

use App\Enums\ImportBatchStatus;
use App\Enums\ImportBatchType;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatch extends Model
{
    use HasUlids;

    protected $fillable = [
        'compound_id',
        'actor_id',
        'type',
        'status',
        'original_filename',
        'is_dry_run',
        'total_rows',
        'created_count',
        'updated_count',
        'skipped_count',
        'error_count',
        'errors',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => ImportBatchType::class,
            'status' => ImportBatchStatus::class,
            'is_dry_run' => 'boolean',
            'total_rows' => 'integer',
            'created_count' => 'integer',
            'updated_count' => 'integer',
            'skipped_count' => 'integer',
            'error_count' => 'integer',
            'errors' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
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
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function hasErrors(): bool
    {
        return $this->error_count > 0;
    }
}
