<?php

namespace App\Http\Resources\Polls;

use App\Enums\VerificationStatus;
use App\Models\Polls\Poll;
use App\Models\User;
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
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'buildingId' => $this->building_id,
            'targetIds' => $this->whenLoaded('targets', fn () => $this->targets->pluck('target_id')->values()->all()),
            'pollTypeId' => $this->poll_type_id,
            'pollType' => PollTypeResource::make($this->whenLoaded('pollType')),
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'scope' => $this->scope,
            'allowMultiple' => $this->allow_multiple,
            'maxChoices' => $this->max_choices,
            'eligibility' => $this->eligibility,
            'startsAt' => $this->starts_at?->toJSON(),
            'endsAt' => $this->ends_at?->toJSON(),
            'publishedAt' => $this->published_at?->toJSON(),
            'closedAt' => $this->closed_at?->toJSON(),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
            'options' => PollOptionResource::collection($this->whenLoaded('options')),
            'votesCount' => (int) ($this->votes_count ?? ($this->relationLoaded('votes') ? $this->votes->count() : 0)),
            'selectedUnitId' => $this->selected_unit_id ?? null,
            'hasVoted' => $this->has_voted ?? null,
            'userVoteOptionIds' => $this->user_vote_option_ids ?? null,
            'voters' => $this->whenLoaded('votes', fn () => $this->votes->map(fn ($vote) => [
                'userId' => $vote->user_id,
                'userName' => $vote->user?->name,
                'unitId' => $vote->unit_id ?? null,
                'unitNumber' => $vote->relationLoaded('unit') ? $vote->unit?->unit_number : null,
                'options' => $vote->relationLoaded('options') ? $vote->options->pluck('label')->toArray() : [],
                'votedAt' => $vote->voted_at?->toIso8601String(),
            ])->toArray()),
            'viewLogs' => $this->whenLoaded('viewLogs', fn () => $this->viewLogs->map(fn ($log) => [
                'userId' => $log->user_id,
                'userName' => $log->user?->name,
                ...$this->resolvePollScopedUnitContext($log->unit_id ?? null, $log->unit_number ?? null, $log->user),
                'firstViewedAt' => $log->first_viewed_at?->toIso8601String(),
                'lastViewedAt' => $log->last_viewed_at?->toIso8601String(),
                'viewCount' => $log->view_count,
            ])),
            'notificationLogs' => $this->whenLoaded('notificationLogs', fn () => $this->notificationLogs->map(fn ($log) => [
                'userId' => $log->user_id,
                'userName' => $log->user?->name,
                ...$this->resolvePollScopedUnitContext($log->unit_id ?? null, $log->unit_number ?? null, $log->user),
                'channel' => $log->channel,
                'notifiedAt' => $log->notified_at?->toIso8601String(),
                'delivered' => $log->delivered,
                'deliveredAt' => $log->delivered_at?->toIso8601String(),
            ])),
        ];
    }

    /**
     * @return array{unitId: string|null, unitNumber: string|null}
     */
    private function resolvePollScopedUnitContext(?string $snapshottedUnitId, ?string $snapshottedUnitNumber, ?User $user): array
    {
        if ($snapshottedUnitId !== null || $snapshottedUnitNumber !== null) {
            return ['unitId' => $snapshottedUnitId, 'unitNumber' => $snapshottedUnitNumber];
        }

        if (! $user || ! $user->relationLoaded('apartmentResidents')) {
            return ['unitId' => null, 'unitNumber' => null];
        }

        $membership = $user->apartmentResidents
            ->filter(function ($membership): bool {
                $unit = $membership->relationLoaded('unit') ? $membership->unit : null;
                $verificationStatus = $membership->verification_status instanceof VerificationStatus
                    ? $membership->verification_status
                    : VerificationStatus::tryFrom((string) $membership->verification_status);

                if (! $unit || $verificationStatus !== VerificationStatus::Verified) {
                    return false;
                }

                if ($membership->starts_at?->isFuture()) {
                    return false;
                }

                if ($membership->ends_at?->isPast()) {
                    return false;
                }

                if ($unit->compound_id !== $this->compound_id) {
                    return false;
                }

                if ($this->scope === 'building' && ! $this->unitMatchesTarget($unit, 'building')) {
                    return false;
                }

                if ($this->scope === 'floor' && ! $this->unitMatchesTarget($unit, 'floor')) {
                    return false;
                }

                return true;
            })
            ->sortByDesc(fn ($membership) => $membership->is_primary ? 1 : 0)
            ->first();

        return [
            'unitId' => $membership?->unit_id,
            'unitNumber' => $membership?->unit?->unit_number,
        ];
    }

    private function unitMatchesTarget($unit, string $targetType): bool
    {
        $targetIds = $this->relationLoaded('targets')
            ? $this->targets->where('target_type', $targetType)->pluck('target_id')->all()
            : [];

        if ($targetIds === [] && $targetType === 'building' && $this->building_id) {
            $targetIds = [$this->building_id];
        }

        $unitValue = $targetType === 'floor' ? $unit->floor_id : $unit->building_id;

        return $unitValue !== null && in_array($unitValue, $targetIds, true);
    }
}
