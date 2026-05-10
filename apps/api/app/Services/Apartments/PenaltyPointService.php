<?php

namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentPenaltyEvent;
use App\Models\Property\Unit;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;

class PenaltyPointService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function add(Unit $unit, User $actor, array $data): ApartmentPenaltyEvent
    {
        return DB::transaction(function () use ($unit, $actor, $data): ApartmentPenaltyEvent {
            $event = ApartmentPenaltyEvent::create([
                'unit_id' => $unit->id,
                'violation_rule_id' => $data['violation_rule_id'] ?? null,
                'points' => $data['points'],
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                'expires_at' => $data['expires_at'] ?? null,
                'applied_by' => $actor->id,
            ]);

            $this->auditLogger->record(
                action: 'apartments.penalty_points_added',
                actor: $actor,
                auditableType: Unit::class,
                auditableId: $unit->id,
                metadata: [
                    'unit_id' => $unit->id,
                    'points' => $event->points,
                    'compound_id' => $unit->compound_id,
                ]
            );

            return $event;
        });
    }

    public function void(ApartmentPenaltyEvent $event, User $actor, string $reason): ApartmentPenaltyEvent
    {
        return DB::transaction(function () use ($event, $actor, $reason): ApartmentPenaltyEvent {
            $event->update([
                'voided_at' => now(),
                'voided_by' => $actor->id,
                'void_reason' => $reason,
            ]);

            $this->auditLogger->record(
                action: 'apartments.penalty_points_voided',
                actor: $actor,
                auditableType: ApartmentPenaltyEvent::class,
                auditableId: (string) $event->id,
                metadata: [
                    'unit_id' => $event->unit_id,
                    'points' => $event->points,
                    'reason' => $reason,
                ]
            );

            return $event;
        });
    }
}
