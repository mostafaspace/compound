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
            'hasVoted'      => $this->has_voted ?? null,
            'userVoteOptionIds' => $this->user_vote_option_ids ?? null,
            'voters'        => $this->whenLoaded('votes', fn () => $this->votes->map(fn ($vote) => [
                'userId'     => $vote->user_id,
                'userName'   => $vote->user?->name,
                'unitId'     => $vote->unit_id ?? null,
                'unitNumber' => $vote->relationLoaded('unit') ? $vote->unit?->unit_number : null,
                'options'    => $vote->relationLoaded('options') ? $vote->options->pluck('label')->toArray() : [],
                'votedAt'    => $vote->voted_at?->toIso8601String(),
            ])->toArray()),
            'viewLogs' => $this->whenLoaded('viewLogs', fn() => $this->viewLogs->map(fn($log) => [
                'userName' => $log->user?->name,
                'firstViewedAt' => $log->first_viewed_at?->toIso8601String(),
                'lastViewedAt' => $log->last_viewed_at?->toIso8601String(),
                'viewCount' => $log->view_count,
            ])),
            'notificationLogs' => $this->whenLoaded('notificationLogs', fn() => $this->notificationLogs->map(fn($log) => [
                'userName' => $log->user?->name,
                'notifiedAt' => $log->notified_at?->toIso8601String(),
                'delivered' => $log->delivered,
            ])),
        ];
    }
}
