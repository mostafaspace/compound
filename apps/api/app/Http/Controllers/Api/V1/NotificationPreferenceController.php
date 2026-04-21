<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\UpdateNotificationPreferenceRequest;
use App\Http\Resources\NotificationPreferenceResource;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function __construct(private AuditLogger $auditLogger)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $preference = $request->user()
            ->notificationPreference()
            ->firstOrCreate([])
            ->refresh();

        return (new NotificationPreferenceResource($preference))
            ->response()
            ->setStatusCode(200);
    }

    public function update(UpdateNotificationPreferenceRequest $request): JsonResponse
    {
        $preference = $request->user()
            ->notificationPreference()
            ->firstOrCreate([])
            ->refresh();

        $updates = [];

        if ($request->has('emailEnabled')) {
            $updates['email_enabled'] = $request->boolean('emailEnabled');
        }

        if ($request->has('inAppEnabled')) {
            $updates['in_app_enabled'] = $request->boolean('inAppEnabled');
        }

        if ($request->has('pushEnabled')) {
            $updates['push_enabled'] = $request->boolean('pushEnabled');
        }

        if ($request->has('quietHoursStart')) {
            $updates['quiet_hours_start'] = $request->input('quietHoursStart');
        }

        if ($request->has('quietHoursEnd')) {
            $updates['quiet_hours_end'] = $request->input('quietHoursEnd');
        }

        if ($request->has('quietHoursTimezone')) {
            $updates['quiet_hours_timezone'] = $request->input('quietHoursTimezone');
        }

        if ($request->has('mutedCategories')) {
            $updates['muted_categories'] = $request->input('mutedCategories');
        }

        if (!empty($updates)) {
            $preference->update($updates);
        }

        $this->auditLogger->record(
            action: 'notification_preferences.updated',
            actor: $request->user(),
            request: $request,
            auditableType: $preference::class,
            auditableId: $preference->id,
            metadata: $updates
        );

        return (new NotificationPreferenceResource($preference->refresh()))
            ->response()
            ->setStatusCode(200);
    }
}
