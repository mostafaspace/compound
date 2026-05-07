<?php

namespace App\Policies\Apartments;

use App\Enums\Permission;
use App\Models\User;

class ApartmentDocumentReviewPolicy
{
    public function review(User $user): bool
    {
        return $user->can(Permission::ApartmentsAdmin->value);
    }
}
