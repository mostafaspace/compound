<?php

namespace App\Http\Resources\Governance;

use App\Models\Governance\Vote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Vote
 */
class VoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'compoundId'            => $this->compound_id,
            'buildingId'            => $this->building_id,
            'type'                  => $this->type,
            'title'                 => $this->title,
            'description'           => $this->description,
            'status'                => $this->status,
            'scope'                 => $this->scope,
            'eligibility'           => $this->eligibility,
            'requiresDocCompliance' => $this->requires_doc_compliance,
            'isAnonymous'           => $this->is_anonymous,
            'startsAt'              => $this->starts_at?->toJSON(),
            'endsAt'                => $this->ends_at?->toJSON(),
            'resultAppliedAt'       => $this->result_applied_at?->toJSON(),
            'createdAt'             => $this->created_at?->toJSON(),
            'updatedAt'             => $this->updated_at?->toJSON(),
            'options'               => VoteOptionResource::collection($this->whenLoaded('options')),
            'participationsCount'   => $this->whenLoaded(
                'participations',
                fn () => $this->participations->count(),
            ),
            'tally'                 => $this->when(
                $this->resource->relationLoaded('options') && $this->resource->relationLoaded('participations'),
                function () {
                    return $this->options->map(function ($option) {
                        return [
                            'optionId' => $option->id,
                            'label'    => $option->label,
                            'count'    => $this->participations->where('option_id', $option->id)->count(),
                        ];
                    })->values();
                }
            ),
        ];
    }
}
