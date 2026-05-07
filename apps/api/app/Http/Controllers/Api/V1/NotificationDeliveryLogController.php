<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DeliveryStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationDeliveryLogResource;
use App\Models\NotificationDeliveryLog;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\ExternalNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

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
        $status = $request->query('status');

        $query = NotificationDeliveryLog::query()
            ->with('notification')
            ->orderByDesc('created_at');

        if ($compoundId !== null) {
            $query->whereHas('notification.user', fn ($q) => $this->scopeUsersToCompound($q, $compoundId));
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

        $user = $notificationDeliveryLog->notification?->user;
        abort_unless($user !== null, Response::HTTP_FORBIDDEN);

        if ($user->isEffectiveSuperAdmin()) {
            $this->context->ensureGlobalCompoundAccess($this->request());
        } else {
            $recipientCompoundId = $this->context->resolveUserCompoundId($user);

            if ($recipientCompoundId !== null) {
                $this->context->ensureCompoundAccess($this->request(), $recipientCompoundId);
            } else {
                $compoundId = $this->context->resolve($this->request());
                abort_unless(
                    $compoundId !== null && $this->userBelongsToCompound($user, $compoundId),
                    Response::HTTP_FORBIDDEN,
                );
            }
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

    private function scopeUsersToCompound($query, string $compoundId): void
    {
        $query->where(function ($scoped) use ($compoundId): void {
            $scoped
                ->where('compound_id', $compoundId)
                ->orWhereHas('apartmentResidents.unit', fn ($unitQuery) => $unitQuery->where('compound_id', $compoundId));
        });
    }

    private function userBelongsToCompound(User $user, string $compoundId): bool
    {
        if ($user->compound_id === $compoundId) {
            return true;
        }

        return $user->apartmentResidents()
            ->whereHas('unit', fn ($unitQuery) => $unitQuery->where('compound_id', $compoundId))
            ->exists();
    }
}
