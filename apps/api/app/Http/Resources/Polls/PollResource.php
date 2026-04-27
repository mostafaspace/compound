<?php

namespace App\Http\Resources\Polls;

use App\Models\Polls\Poll;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Poll
 */
class PollResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'compoundId'    => $this->compound_id,
            'buildingId'    => $this->building_id,
            'pollTypeId'    => $this->poll_type_id,
            'pollType'      => PollTypeResource::make($this->whenLoaded('pollType')),
            'title'         => $this->title,
            'description'   => $this->description,
            'status'        => $this->status,
            'scope'         => $this->scope,
            'isAnonymous'   => $this->is_anonymous,
            'allowMultiple' => $this->allow_multiple,
            'maxChoices'    => $this->max_choices,
            'eligibility'   => $this->eligibility,
            'startsAt'      => $this->starts_at?->toJSON(),
            'endsAt'        => $this->ends_at?->toJSON(),
            'publishedAt'   => $this->published_at?->toJSON(),
            'closedAt'      => $this->closed_at?->toJSON(),
            'createdAt'     => $this->created_at?->toJSON(),
            'updatedAt'     => $this->updated_at?->toJSON(),
            'options'       => PollOptionResource::collection($this->whenLoaded('options')),
            'votesCount'    => $this->whenLoaded('votes', fn () => $this->votes->count(), 0),
            // Set via $poll->setAttribute('has_voted', bool) in controller before returning
            'hasVoted'      => $this->has_voted ?? null,
            // Set via $poll->setAttribute('user_vote_option_ids', int[]) in controller
            'userVoteOptionIds' => $this->user_vote_option_ids ?? null,
        ];
    }
}
