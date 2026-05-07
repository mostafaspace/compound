<?php

namespace App\Providers;

use App\Models\Property\Unit;
use App\Models\User;
use App\Policies\Apartments\ApartmentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Unit::class => ApartmentPolicy::class,
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
