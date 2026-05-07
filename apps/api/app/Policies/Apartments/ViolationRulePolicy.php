<?php

namespace App\Policies\Apartments;

use App\Enums\Permission;
use App\Models\User;

class ViolationRulePolicy
{
    public function manage(User $user): bool
    {
        return $user->can(Permission::ApartmentsAdmin->value);
    }

    public function apply(User $user): bool
    {
        return $user->can(Permission::ApplyApartmentViolation->value);
    }
}
