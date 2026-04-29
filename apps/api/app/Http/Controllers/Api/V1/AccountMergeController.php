<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountMergeStatus;
use App\Http\Controllers\Controller;
use App\Models\AccountMerge;
use App\Models\User;
use App\Services\AccountMergeService;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountMergeController extends Controller
{
    public function __construct(
        private readonly AccountMergeService $service,
        private readonly CompoundContextService $context,
    ) {}

    /**
     * List account merges (scoped to compound).
     */
    public function index(Request $request): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        $merges = AccountMerge::query()
            ->with(['sourceUser', 'targetUser', 'initiator'])
            ->when($compoundId !== null, function ($q) use ($compoundId): void {
                $q->whereHas('sourceUser', fn ($u) => $this->context->scopeUsersToCompound($u, $compoundId));
            })
            ->latest()
            ->paginate(25);

        return response()->json($merges->through(fn ($m) => $this->formatMerge($m)));
    }

    /**
     * Initiate a merge: validates both users, runs dry-run analysis, creates pending record.
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_user_id' => ['required', 'integer', 'exists:users,id'],
            'target_user_id' => ['required', 'integer', 'exists:users,id', 'different:source_user_id'],
            'notes'          => ['nullable', 'string', 'max:1000'],
        ]);

        $source = User::findOrFail($validated['source_user_id']);
        $target = User::findOrFail($validated['target_user_id']);

        $compoundId = $this->context->resolve($request);

        if ($compoundId !== null) {
            $this->context->ensureUserAccess($request, $source);
            $this->context->ensureUserAccess($request, $target);
        }

        // Block if either user already has a pending merge
        $existingPending = AccountMerge::query()
            ->where('status', AccountMergeStatus::Pending->value)
            ->where(function ($q) use ($source, $target): void {
                $q->whereIn('source_user_id', [$source->id, $target->id])
                  ->orWhereIn('target_user_id', [$source->id, $target->id]);
            })
            ->exists();

        if ($existingPending) {
            abort(422, 'One of these users already has a pending merge.');
        }

        $analysis = $this->service->analyze($source, $target);

        $merge = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by'   => Auth::id(),
            'status'         => AccountMergeStatus::Pending,
            'notes'          => $validated['notes'] ?? null,
            'merge_analysis' => $analysis,
        ]);

        return response()->json($this->formatMerge($merge->load(['sourceUser', 'targetUser', 'initiator'])), 201);
    }

    /**
     * Show a merge record.
     */
    public function show(AccountMerge $accountMerge): JsonResponse
    {
        $accountMerge->load(['sourceUser', 'targetUser', 'initiator']);

        if ($accountMerge->sourceUser !== null) {
            $this->context->ensureUserAccess(request(), $accountMerge->sourceUser);
        }

        return response()->json($this->formatMerge($accountMerge));
    }

    /**
     * Confirm and execute the merge.
     */
    public function confirm(Request $request, AccountMerge $accountMerge): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        if ($compoundId !== null && $accountMerge->sourceUser !== null) {
            $this->context->ensureUserAccess($request, $accountMerge->sourceUser);
        }

        $this->service->execute($accountMerge, $request->user());

        return response()->json($this->formatMerge($accountMerge->fresh(['sourceUser', 'targetUser', 'initiator'])));
    }

    /**
     * Cancel a pending merge.
     */
    public function cancel(Request $request, AccountMerge $accountMerge): JsonResponse
    {
        if ($accountMerge->sourceUser !== null) {
            $this->context->ensureUserAccess($request, $accountMerge->sourceUser);
        }

        if ($accountMerge->status !== AccountMergeStatus::Pending) {
            abort(422, 'Only pending merges can be cancelled.');
        }

        $accountMerge->update([
            'status'       => AccountMergeStatus::Cancelled,
            'cancelled_at' => now(),
        ]);

        return response()->json($this->formatMerge($accountMerge->refresh()));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMerge(AccountMerge $merge): array
    {
        return [
            'id'            => $merge->id,
            'sourceUser'    => $merge->sourceUser ? [
                'id'    => $merge->sourceUser->id,
                'name'  => $merge->sourceUser->name,
                'email' => $merge->sourceUser->email,
                'status' => $merge->sourceUser->status?->value,
            ] : null,
            'targetUser'    => $merge->targetUser ? [
                'id'    => $merge->targetUser->id,
                'name'  => $merge->targetUser->name,
                'email' => $merge->targetUser->email,
                'status' => $merge->targetUser->status?->value,
            ] : null,
            'initiator'     => $merge->initiator ? [
                'id'    => $merge->initiator->id,
                'name'  => $merge->initiator->name,
            ] : null,
            'status'        => $merge->status?->value,
            'notes'         => $merge->notes,
            'mergeAnalysis' => $merge->merge_analysis,
            'completedAt'   => $merge->completed_at?->toIso8601String(),
            'cancelledAt'   => $merge->cancelled_at?->toIso8601String(),
            'createdAt'     => $merge->created_at?->toIso8601String(),
        ];
    }
}
