<?php

namespace App\Providers;

use App\Events\NotificationCreatedEvent;
use App\Listeners\NotificationCreatedListener;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Factory as FirebaseFactory;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(Messaging::class, function (): Messaging {
            $credentialsPath = env('FIREBASE_CREDENTIALS', storage_path('app/firebase-credentials.json'));

            return (new FirebaseFactory)
                ->withServiceAccount($credentialsPath)
                ->createMessaging();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(NotificationCreatedEvent::class, NotificationCreatedListener::class);

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->input('email', '').'|'.$request->ip());
        });

        RateLimiter::for('invitation-accept', function (Request $request) {
            return Limit::perMinute(10)->by((string) $request->route('token').'|'.$request->ip());
        });

        RateLimiter::for('invitation-show', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('document-upload', function (Request $request) {
            return Limit::perMinute(10)->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('visitor-request-create', function (Request $request) {
            return Limit::perMinute(10)->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('visitor-pass-scan', function (Request $request) {
            return Limit::perMinute(60)->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('issue-create', function (Request $request) {
            return Limit::perMinute(8)->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('payment-submit', function (Request $request) {
            return Limit::perMinute(6)->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip());
        });
    }
}
