<?php

namespace App\Services\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;

class ViolationApplicationService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function apply(Unit $unit, ViolationRule $rule, User $admin, array $data): ApartmentViolation
    {
        return ApartmentViolation::query()->create([
            'unit_id' => $unit->id,
            'violation_rule_id' => $rule->id,
            'applied_by' => $admin->id,
            'fee' => $data['fee'] ?? $rule->default_fee,
            'notes' => $data['notes'] ?? null,
            'status' => ApartmentViolationStatus::Pending,
        ]);
    }

    public function markPaid(ApartmentViolation $violation): ApartmentViolation
    {
        $violation->update([
            'status' => ApartmentViolationStatus::Paid,
            'paid_at' => now(),
        ]);

        return $violation->refresh();
    }

    public function markWaived(ApartmentViolation $violation, string $reason): ApartmentViolation
    {
        $violation->update([
            'status' => ApartmentViolationStatus::Waived,
            'waived_reason' => $reason,
        ]);

        return $violation->refresh();
    }
}
