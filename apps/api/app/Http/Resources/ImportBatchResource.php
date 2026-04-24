<?php

namespace App\Http\Resources;

use App\Models\Import\ImportBatch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ImportBatch
 */
class ImportBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'typeLabel' => $this->type->label(),
            'status' => $this->status->value,
            'originalFilename' => $this->original_filename,
            'isDryRun' => $this->is_dry_run,
            'totalRows' => $this->total_rows,
            'createdCount' => $this->created_count,
            'updatedCount' => $this->updated_count,
            'skippedCount' => $this->skipped_count,
            'errorCount' => $this->error_count,
            'errors' => $this->when(
                $this->errors !== null,
                $this->errors,
            ),
            'compound' => $this->whenLoaded('compound', fn () => [
                'id' => $this->compound->id,
                'name' => $this->compound->name,
            ]),
            'actor' => $this->whenLoaded('actor', fn () => [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
            ]),
            'startedAt' => $this->started_at?->toIso8601String(),
            'completedAt' => $this->completed_at?->toIso8601String(),
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
