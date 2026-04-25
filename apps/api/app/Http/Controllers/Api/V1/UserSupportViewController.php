<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserSupportViewController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    /**
     * Search / list users for the support console.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q'       => ['nullable', 'string', 'max:160'],
            'status'  => ['nullable', 'string'],
            'role'    => ['nullable', 'string'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $compoundId = $this->context->resolve($request);

        $query = User::query()
            ->when($compoundId !== null, fn ($b) => $b->where('compound_id', $compoundId))
            ->when($validated['status'] ?? null, fn ($b, string $v) => $b->where('status', $v))
            ->when($validated['role'] ?? null, fn ($b, string $v) => $b->where('role', $v))
            ->when($validated['q'] ?? null, function ($b, string $search): void {
                $term = '%'.$search.'%';
                $b->where(function ($inner) use ($term): void {
                    $inner
                        ->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('phone', 'like', $term);
                });
            })
            ->orderBy('name');

        return UserResource::collection($query->paginate($validated['perPage'] ?? 25));
    }

    /**
     * Comprehensive support view: profile + unit memberships + documents + verification + audit events.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        if ($compoundId !== null) {
            $this->context->ensureCompoundAccess($request, $user->compound_id ?? '');
        }

        $user->loadMissing([
            'unitMemberships.unit',
            'documents',
            'verificationRequests' => fn ($q) => $q->latest()->limit(5),
            'residentInvitations'  => fn ($q) => $q->latest()->limit(5),
        ]);

        // Recent audit events where this user was the actor
        $recentAuditEvents = AuditLog::query()
            ->with('actor')
            ->where('actor_id', $user->id)
            ->latest()
            ->limit(10)
            ->get();

        // Document status counts
        $docCounts = $user->documents->groupBy('status')->map->count();

        // Unit memberships (all, not just active)
        $memberships = $user->unitMemberships->map(fn ($m) => [
            'id'                  => $m->id,
            'unit_id'             => $m->unit_id,
            'unit_name'           => $m->unit?->name,
            'unit_number'         => $m->unit?->number,
            'relation_type'       => $m->relation_type?->value,
            'starts_at'           => $m->starts_at?->toDateString(),
            'ends_at'             => $m->ends_at?->toDateString(),
            'is_primary'          => $m->is_primary,
            'verification_status' => $m->verification_status?->value,
        ])->all();

        // Active merges (as source or target)
        $activeMerges = \App\Models\AccountMerge::query()
            ->where(function ($q) use ($user): void {
                $q->where('source_user_id', $user->id)
                  ->orWhere('target_user_id', $user->id);
            })
            ->where('status', \App\Enums\AccountMergeStatus::Pending->value)
            ->with(['sourceUser', 'targetUser'])
            ->get();

        return response()->json([
            'user'              => UserResource::make($user),
            'memberships'       => $memberships,
            'documentCounts'    => $docCounts,
            'verificationStatus' => $user->verificationRequests->first()?->status?->value,
            'recentAuditEvents' => AuditLogResource::collection($recentAuditEvents),
            'activeMerges'      => $activeMerges->map(fn ($m) => [
                'id'             => $m->id,
                'sourceUserId'   => $m->source_user_id,
                'targetUserId'   => $m->target_user_id,
                'status'         => $m->status?->value,
                'notes'          => $m->notes,
                'createdAt'      => $m->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /**
     * Detect potential duplicate accounts for a user (same compound, similar name/email).
     */
    public function duplicates(Request $request, User $user): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        if ($compoundId !== null) {
            $this->context->ensureCompoundAccess($request, $user->compound_id ?? '');
        }

        $candidates = User::query()
            ->where('id', '!=', $user->id)
            ->where('status', '!=', AccountStatus::Archived->value)
            ->when($compoundId !== null, fn ($b) => $b->where('compound_id', $compoundId))
            ->where(function ($q) use ($user): void {
                // Exact email match, or similar name (within same compound)
                $q->where('email', $user->email)
                  ->orWhere(function ($inner) use ($user): void {
                      $nameParts = explode(' ', strtolower($user->name));
                      foreach ($nameParts as $part) {
                          if (strlen($part) > 2) {
                              $inner->orWhere('name', 'like', '%'.$part.'%');
                          }
                      }
                  });
            })
            ->limit(10)
            ->get();

        return response()->json(['candidates' => UserResource::collection($candidates)]);
    }
}
