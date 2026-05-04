<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NotificationCategory;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Enums\VisitorRequestStatus;
use App\Enums\VisitorScanResult;
use App\Http\Controllers\Controller;
use App\Http\Requests\Visitors\StoreVisitorRequestRequest;
use App\Http\Requests\Visitors\ValidateVisitorPassRequest;
use App\Http\Requests\Visitors\VisitorDecisionRequest;
use App\Http\Resources\Visitors\VisitorRequestResource;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use App\Services\CompoundContextService;
use App\Services\NotificationService;
use App\Services\VisitorPassService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class VisitorRequestController extends Controller
{
    private const STAFF_ROLES = [
        UserRole::SuperAdmin,
        UserRole::CompoundAdmin,
        UserRole::SecurityGuard,
        UserRole::SupportAgent,
    ];

    private const NOTIFIABLE_SECURITY_ROLE_NAMES = [
        'security_guard',
        'compound_admin',
        'compound_head',
    ];

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
        private readonly NotificationService $notificationService,
        private readonly VisitorPassService $visitorPassService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();
        $status = $request->string('status')->toString();

        $visitorRequests = VisitorRequest::query()
            ->with(['host', 'unit.building.compound', 'pass'])
            ->when(! $this->isStaff($user), fn ($query) => $query->where('host_user_id', $user->id))
            ->when($status !== '' && $status !== 'all', function ($query) use ($status) {
                $statuses = explode(',', $status);
                if (count($statuses) > 1) {
                    $query->whereIn('status', $statuses);
                } else {
                    $query->where('status', $status);
                }
            })
            ->tap(fn ($query) => $this->compoundContext->scopePropertyQuery($query, $user))
            ->latest('visit_starts_at')
            ->paginate();

        return VisitorRequestResource::collection($visitorRequests);
    }

    public function show(Request $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->isStaff($user)) {
            $this->ensureStaffCanAccessVisitorRequest($request, $visitorRequest);
        } else {
            abort_unless($visitorRequest->host_user_id === $user->id, Response::HTTP_FORBIDDEN);
        }

        $visitorRequest->load(['host', 'unit.building.compound', 'pass']);

        return VisitorRequestResource::make($visitorRequest);
    }

    public function store(StoreVisitorRequestRequest $request): VisitorRequestResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        abort_unless($this->canHostUnit($actor, $validated['unitId']), Response::HTTP_FORBIDDEN, 'User cannot create visitor requests for this unit.');

        $visitorRequest = null;
        $token = null;

        DB::transaction(function () use (&$visitorRequest, &$token, $actor, $validated, $request): void {
            $pictureUrl = $validated['pictureUrl'] ?? null;

            if ($request->hasFile('picture')) {
                $file = $request->file('picture');
                $path = $file->store('visitors/pictures', config('filesystems.default'));
                $pictureUrl = Storage::url($path);
            }

            $visitorRequest = VisitorRequest::query()->create([
                'host_user_id' => $actor->id,
                'unit_id' => $validated['unitId'],
                'visitor_name' => $validated['visitorName'],
                'visitor_phone' => $validated['visitorPhone'] ?? null,
                'vehicle_plate' => $validated['vehiclePlate'] ?? null,
                'visit_starts_at' => $validated['visitStartsAt'],
                'visit_ends_at' => $validated['visitEndsAt'],
                'notes' => $validated['notes'] ?? null,
                'picture_url' => $pictureUrl,
                'number_of_visitors' => $validated['numberOfVisitors'] ?? null,
                'status' => VisitorRequestStatus::Pending->value,
            ]);

            $token = $this->visitorPassService->issuePass($visitorRequest);
        });

        $visitorRequest->load(['host', 'unit.building.compound', 'pass']);
        $visitorRequest->setAttribute('qr_token', $token);

        $this->auditLogger->record('visitors.request_created', actor: $actor, request: $request, metadata: [
            'visitor_request_id' => $visitorRequest->id,
            'unit_id' => $visitorRequest->unit_id,
        ]);

        $this->notifySecurity($visitorRequest);

        return VisitorRequestResource::make($visitorRequest);
    }

    public function validatePass(ValidateVisitorPassRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $pass = $this->visitorPassService->findPassByToken($validated['token']);

        if ($pass?->visitorRequest instanceof VisitorRequest) {
            $this->ensureStaffCanAccessVisitorRequest($request, $pass->visitorRequest);
        }

        $result = $this->visitorPassService->validateToken($validated['token'], $actor, 'validated');

        $visitorRequest = $result['visitorRequest'];

        $this->auditLogger->record('visitors.pass_validated', actor: $actor, request: $request, metadata: [
            'result' => $result['result']->value,
            'visitor_request_id' => $visitorRequest?->id,
        ]);

        return response()->json([
            'data' => [
                'result' => $result['result']->value,
                'visitorRequest' => $visitorRequest ? VisitorRequestResource::make($visitorRequest) : null,
            ],
        ]);
    }

    public function arrive(VisitorDecisionRequest $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        $this->ensureStaffCanAccessVisitorRequest($request, $visitorRequest);
        $this->abortUnlessActionable($visitorRequest);
        $this->abortUnlessInStatus($visitorRequest, [VisitorRequestStatus::Pending, VisitorRequestStatus::QrIssued], 'Visitor cannot be marked arrived from its current status.');

        /** @var User $actor */
        $actor = $request->user();
        $visitorRequest = $this->visitorPassService->arrive($visitorRequest, $actor);

        $this->recordDecision('visitors.arrived', $actor, $request, $visitorRequest);
        $this->notifyHost($visitorRequest, 'Visitor arrived', "{$visitorRequest->visitor_name} arrived at the gate.");

        return VisitorRequestResource::make($visitorRequest);
    }

    public function allow(VisitorDecisionRequest $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        $this->ensureStaffCanAccessVisitorRequest($request, $visitorRequest);
        $this->abortUnlessActionable($visitorRequest);
        $this->abortUnlessInStatus($visitorRequest, [VisitorRequestStatus::Pending, VisitorRequestStatus::QrIssued, VisitorRequestStatus::Arrived], 'Visitor cannot be allowed from its current status.');
        $pass = $visitorRequest->pass;
        abort_if(
            ! $pass || $this->visitorPassService->resultForPass($pass) !== VisitorScanResult::Valid,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Visitor pass is not valid for entry.',
        );

        /** @var User $actor */
        $actor = $request->user();
        $visitorRequest = $this->visitorPassService->allow($visitorRequest, $actor);

        $this->recordDecision('visitors.allowed', $actor, $request, $visitorRequest);
        $this->notifyHost($visitorRequest, 'Visitor allowed', "{$visitorRequest->visitor_name} was allowed entry.");

        return VisitorRequestResource::make($visitorRequest);
    }

    public function deny(VisitorDecisionRequest $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        $this->ensureStaffCanAccessVisitorRequest($request, $visitorRequest);
        $this->abortUnlessActionable($visitorRequest);
        $this->abortUnlessInStatus($visitorRequest, [VisitorRequestStatus::Pending, VisitorRequestStatus::QrIssued, VisitorRequestStatus::Arrived], 'Visitor cannot be denied from its current status.');

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $visitorRequest = $this->visitorPassService->deny($visitorRequest, $actor, $validated['reason'] ?? null);

        $this->recordDecision('visitors.denied', $actor, $request, $visitorRequest);
        $this->notifyHost($visitorRequest, 'Visitor denied', "{$visitorRequest->visitor_name} was denied entry.");

        return VisitorRequestResource::make($visitorRequest);
    }

    public function complete(VisitorDecisionRequest $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        $this->ensureStaffCanAccessVisitorRequest($request, $visitorRequest);
        $this->abortUnlessActionable($visitorRequest);
        $this->abortUnlessInStatus($visitorRequest, [VisitorRequestStatus::Allowed], 'Only allowed visits can be completed.');

        /** @var User $actor */
        $actor = $request->user();
        $visitorRequest = $this->visitorPassService->complete($visitorRequest, $actor);

        $this->recordDecision('visitors.completed', $actor, $request, $visitorRequest);
        $this->notifyHost($visitorRequest, 'Visit completed', "{$visitorRequest->visitor_name}'s visit was completed.");

        return VisitorRequestResource::make($visitorRequest);
    }

    public function markAsShared(Request $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        /** @var User $actor */
        $actor = $request->user();

        abort_unless($visitorRequest->host_user_id === $actor->id, Response::HTTP_FORBIDDEN);

        $visitorRequest->update(['shared_at' => now()]);

        $this->auditLogger->record('visitors.pass_shared', actor: $actor, request: $request, metadata: [
            'visitor_request_id' => $visitorRequest->id,
        ]);

        return VisitorRequestResource::make($visitorRequest);
    }

    public function cancel(VisitorDecisionRequest $request, VisitorRequest $visitorRequest): VisitorRequestResource
    {
        /** @var User $actor */
        $actor = $request->user();

        abort_unless($this->isStaff($actor) || $visitorRequest->host_user_id === $actor->id, Response::HTTP_FORBIDDEN);
        if ($this->isStaff($actor) && $visitorRequest->host_user_id !== $actor->id) {
            $this->ensureStaffCanAccessVisitorRequest($request, $visitorRequest);
        }
        $this->abortUnlessActionable($visitorRequest);
        $this->abortUnlessInStatus($visitorRequest, [VisitorRequestStatus::Pending, VisitorRequestStatus::QrIssued, VisitorRequestStatus::Arrived], 'Visitor cannot be cancelled from its current status.');

        $validated = $request->validated();
        $visitorRequest = $this->visitorPassService->cancel($visitorRequest, $actor, $validated['reason'] ?? null);

        $this->recordDecision('visitors.cancelled', $actor, $request, $visitorRequest);

        return VisitorRequestResource::make($visitorRequest);
    }

    private function canHostUnit(User $user, string $unitId): bool
    {
        if ($this->isStaff($user)) {
            return $this->compoundContext->userCanAccessUnit($user, $unitId);
        }

        return UnitMembership::query()
            ->where('user_id', $user->id)
            ->where('unit_id', $unitId)
            ->whereNull('ends_at')
            ->where('verification_status', VerificationStatus::Verified->value)
            ->exists();
    }

    private function isStaff(User $user): bool
    {
        return $user->hasAnyEffectiveRole(self::STAFF_ROLES);
    }

    private function abortUnlessActionable(VisitorRequest $visitorRequest): void
    {
        abort_if(
            in_array($visitorRequest->status, [
                VisitorRequestStatus::Denied,
                VisitorRequestStatus::Completed,
                VisitorRequestStatus::Cancelled,
            ], strict: true),
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Visitor request is already closed.',
        );
    }

    /**
     * @param  array<int, VisitorRequestStatus>  $statuses
     */
    private function abortUnlessInStatus(VisitorRequest $visitorRequest, array $statuses, string $message): void
    {
        abort_unless(in_array($visitorRequest->status, $statuses, strict: true), Response::HTTP_UNPROCESSABLE_ENTITY, $message);
    }

    private function recordDecision(string $action, User $actor, Request $request, VisitorRequest $visitorRequest): void
    {
        $this->auditLogger->record($action, actor: $actor, request: $request, metadata: [
            'visitor_request_id' => $visitorRequest->id,
            'status' => $visitorRequest->status->value,
            'unit_id' => $visitorRequest->unit_id,
        ]);
    }

    private function notifyHost(VisitorRequest $visitorRequest, string $title, string $body): void
    {
        $this->notificationService->create(
            userId: $visitorRequest->host_user_id,
            category: NotificationCategory::Visitors,
            title: $title,
            body: $body,
            metadata: [
                'visitorRequestId' => $visitorRequest->id,
                'unitId' => $visitorRequest->unit_id,
                'status' => $visitorRequest->status->value,
            ],
            priority: 'high',
        );
    }

    private function notifySecurity(VisitorRequest $visitorRequest): void
    {
        $visitorRequest->loadMissing('unit');
        $compoundId = $visitorRequest->unit?->compound_id;

        User::query()
            ->where(function ($query): void {
                $query
                    ->whereHas('roles', function ($roleQuery): void {
                        $roleQuery
                            ->where('guard_name', 'sanctum')
                            ->whereIn('name', self::NOTIFIABLE_SECURITY_ROLE_NAMES);
                    })
                    ->orWhere(function ($legacyFallback): void {
                        $legacyFallback
                            ->whereDoesntHave('roles')
                            ->whereIn('role', [UserRole::SecurityGuard->value, UserRole::CompoundAdmin->value]);
                    });
            })
            ->where('status', 'active')
            ->when($compoundId !== null, fn ($query) => $query->where(function ($scoped) use ($compoundId): void {
                $scoped
                    ->where('compound_id', $compoundId)
                    ->orWhereNull('compound_id');
            }))
            ->each(function (User $user) use ($visitorRequest): void {
                $this->notificationService->create(
                    userId: $user->id,
                    category: NotificationCategory::Visitors,
                    title: 'Visitor pass issued',
                    body: "{$visitorRequest->visitor_name} is expected for unit {$visitorRequest->unit?->unit_number}.",
                    metadata: [
                        'visitorRequestId' => $visitorRequest->id,
                        'unitId' => $visitorRequest->unit_id,
                        'status' => $visitorRequest->status->value,
                    ],
                    priority: 'normal',
                );
            });
    }

    private function ensureStaffCanAccessVisitorRequest(Request $request, VisitorRequest $visitorRequest): void
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($this->compoundContext->userCanAccessUnit($user, $visitorRequest->unit_id), Response::HTTP_FORBIDDEN);
    }
}
