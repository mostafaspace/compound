<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DeliveryStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationDeliveryLogResource;
use App\Models\NotificationDeliveryLog;
use App\Services\CompoundContextService;
use App\Services\ExternalNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationDeliveryLogController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $context,
        private readonly ExternalNotificationService $service,
    ) {}

    /**
     * List delivery logs for the current compound, with optional status filter.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->context->resolve($request);
        $status     = $request->query('status');

        $query = NotificationDeliveryLog::query()
            ->with('notification')
            ->orderByDesc('created_at');

        if ($compoundId !== null) {
            $query->whereHas('notification.user', fn ($q) => $q->where('compound_id', $compoundId));
        }

        if ($status && DeliveryStatus::tryFrom($status)) {
            $query->where('status', $status);
        }

        return NotificationDeliveryLogResource::collection(
            $query->paginate(50)
        );
    }

    /**
     * Retry a failed delivery log entry.
     */
    public function retry(NotificationDeliveryLog $notificationDeliveryLog): JsonResponse
    {
        $notificationDeliveryLog->loadMissing('notification.user');

        if ($notificationDeliveryLog->notification?->user?->compound_id !== null) {
            $this->context->ensureCompoundAccess($this->request(), $notificationDeliveryLog->notification->user->compound_id);
        } else {
            $this->context->ensureGlobalCompoundAccess($this->request());
        }

        if ($notificationDeliveryLog->status !== DeliveryStatus::Failed) {
            abort(422, 'Only failed deliveries can be retried.');
        }

        $newLog = $this->service->retry($notificationDeliveryLog);

        return NotificationDeliveryLogResource::make($newLog)
            ->response()
            ->setStatusCode(201);
    }

    private function request(): Request
    {
        return request();
    }
}
