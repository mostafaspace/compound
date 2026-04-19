<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Notifications\UpdateNotificationPreferenceRequest;
use App\Http\Resources\NotificationPreferenceResource;
use App\Models\NotificationPreference;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationPreferenceController extends Controller
{
    public function __construct(private AuditLogger $auditLogger)
    {
    }

    public function show(Request $request): JsonResource
    {
        $preference = $request->user()->notificationPreference;

        if (!$preference) {
            $preference = NotificationPreference::create([
                'user_id' => $request->user()->id,
            ]);
        }

        return new NotificationPreferenceResource($preference);
    }

    public function update(UpdateNotificationPreferenceRequest $request): JsonResource
    {
        $preference = $request->user()->notificationPreference;

        if (!$preference) {
            $preference = NotificationPreference::create([
                'user_id' => $request->user()->id,
            ]);
        }

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
            model: $preference,
            changes: $updates
        );

        return new NotificationPreferenceResource($preference->refresh());
    }
}
