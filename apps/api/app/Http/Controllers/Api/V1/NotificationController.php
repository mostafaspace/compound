<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Notifications\MarkNotificationReadRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
        private AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Notification::where('user_id', $request->user()->id)
            ->notArchived();

        if ($request->has('category')) {
            $query->where('category', $request->get('category'));
        }

        if ($request->get('read') === 'unread') {
            $query->unread();
        } elseif ($request->get('read') === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return NotificationResource::collection($notifications);
    }

    public function show(Notification $notification): JsonResource
    {
        $this->authorize('view', $notification);

        return new NotificationResource($notification);
    }

    public function markAsRead(Notification $notification, MarkNotificationReadRequest $request): JsonResource
    {
        $this->authorize('update', $notification);

        $this->notificationService->markAsRead($notification->id);

        $this->auditLogger->record(
            action: 'notifications.marked_read',
            model: $notification,
            changes: ['read_at' => now()->toIso8601String()]
        );

        return new NotificationResource($notification->refresh());
    }

    public function archive(Notification $notification): JsonResource
    {
        $this->authorize('update', $notification);

        $this->notificationService->archive($notification->id);

        $this->auditLogger->record(
            action: 'notifications.archived',
            model: $notification,
            changes: ['archived_at' => now()->toIso8601String()]
        );

        return new NotificationResource($notification->refresh());
    }

    public function markAllAsRead(Request $request): JsonResource
    {
        $count = $this->notificationService->markAllAsRead($request->user()->id);

        $this->auditLogger->record(
            action: 'notifications.marked_all_read',
            model: null,
            changes: ['count' => $count]
        );

        return response()->json([
            'message' => 'All notifications marked as read',
            'count' => $count,
        ])->toResponse($request);
    }

    public function archiveAll(Request $request): JsonResource
    {
        $count = $this->notificationService->archiveAll($request->user()->id);

        $this->auditLogger->record(
            action: 'notifications.archived_all',
            model: null,
            changes: ['count' => $count]
        );

        return response()->json([
            'message' => 'All notifications archived',
            'count' => $count,
        ])->toResponse($request);
    }

    public function getUnreadCount(Request $request): JsonResource
    {
        $count = $this->notificationService->getUnreadCount($request->user()->id);

        return response()->json([
            'unreadCount' => $count,
        ])->toResponse($request);
    }
}
