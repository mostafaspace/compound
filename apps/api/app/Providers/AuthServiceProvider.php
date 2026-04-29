<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Super admin bypasses ALL permission checks.
        Gate::before(function ($user, $ability) {
            if (
                $user instanceof \App\Models\User
                && $user->isEffectiveSuperAdmin()
            ) {
                return true;
            }
        });
    }
}
