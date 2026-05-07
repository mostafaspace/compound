<?php

namespace App\Policies\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;

class ApartmentPolicy
{
    public function view(User $user, Unit $unit): bool
    {
        return $this->hasActiveVerifiedMembership($user, $unit);
    }

    public function manage(User $user, Unit $unit): bool
    {
        return $this->hasActiveVerifiedMembership($user, $unit);
    }

    private function hasActiveVerifiedMembership(User $user, Unit $unit): bool
    {
        return ApartmentResident::query()
            ->active()
            ->where('user_id', $user->id)
            ->where('unit_id', $unit->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->exists();
    }
}
