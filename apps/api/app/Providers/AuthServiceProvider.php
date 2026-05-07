<?php

namespace App\Providers;

use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use App\Policies\Apartments\ApartmentDocumentReviewPolicy;
use App\Policies\Apartments\ApartmentPolicy;
use App\Policies\Apartments\ViolationRulePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    protected $policies = [
        ApartmentDocumentVersion::class => ApartmentDocumentReviewPolicy::class,
        Unit::class => ApartmentPolicy::class,
        ViolationRule::class => ViolationRulePolicy::class,
    ];

    public function boot(): void
    {
        // Super admin bypasses ALL permission checks.
        Gate::before(function ($user, $ability) {
            if (
                $user instanceof User
                && $user->isEffectiveSuperAdmin()
            ) {
                return true;
            }
        });
    }
}
