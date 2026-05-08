<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// CM-109: Operational analytics dashboard
class OperationalAnalyticsController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'buildingId' => ['nullable', 'string', 'max:36'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id') ?: $request->query('compoundId');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $buildingId = $validated['buildingId'] ?? null;
        $from = $validated['from'] ?? null;
        $to = isset($validated['to']) ? $validated['to'].' 23:59:59' : null;

        return response()->json([
            'data' => [
                'users' => $this->userMetrics($compoundIds, $from, $to),
                'invitations' => $this->invitationMetrics($compoundIds, $from, $to),
                'verifications' => $this->verificationMetrics($compoundIds, $from, $to),
                'documents' => $this->documentMetrics($compoundIds, $from, $to),
                'visitors' => $this->visitorMetrics($compoundIds, $buildingId, $from, $to),
                'issues' => $this->issueMetrics($compoundIds, $buildingId, $from, $to),
                'announcements' => $this->announcementMetrics($compoundIds, $from, $to),
                'votes' => $this->voteMetrics($compoundIds, $buildingId, $from, $to),
                'generatedAt' => now()->toIso8601String(),
            ],
        ]);
    }

    // ─── Metric helpers ──────────────────────────────────────────────────────

    /** @param list<string>|null $compoundIds */
    private function userMetrics(?array $compoundIds, ?string $from, ?string $to): array
    {
        $counts = DB::table('users')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        return [
            'total' => (int) $counts->sum(),
            'active' => (int) ($counts['active'] ?? 0),
            'invited' => (int) ($counts['invited'] ?? 0),
            'pendingReview' => (int) ($counts['pending_review'] ?? 0),
            'suspended' => (int) ($counts['suspended'] ?? 0),
            'archived' => (int) ($counts['archived'] ?? 0),
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function invitationMetrics(?array $compoundIds, ?string $from, ?string $to): array
    {
        $counts = DB::table('resident_invitations as ri')
            ->leftJoin('units', 'units.id', '=', 'ri.unit_id')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('units.compound_id', $compoundIds))
            ->when($from, fn ($q) => $q->where('ri.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('ri.created_at', '<=', $to))
            ->select('ri.status', DB::raw('count(*) as count'))
            ->groupBy('ri.status')
            ->pluck('count', 'ri.status');

        return [
            'total' => (int) $counts->sum(),
            'pending' => (int) ($counts['pending'] ?? 0),
            'accepted' => (int) ($counts['accepted'] ?? 0),
            'revoked' => (int) ($counts['revoked'] ?? 0),
            'expired' => (int) ($counts['expired'] ?? 0),
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function verificationMetrics(?array $compoundIds, ?string $from, ?string $to): array
    {
        $counts = DB::table('verification_requests as vr')
            ->join('users as u', 'u.id', '=', 'vr.user_id')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('u.compound_id', $compoundIds))
            ->when($from, fn ($q) => $q->where('vr.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('vr.created_at', '<=', $to))
            ->select('vr.status', DB::raw('count(*) as count'))
            ->groupBy('vr.status')
            ->pluck('count', 'vr.status');

        return [
            'total' => (int) $counts->sum(),
            'pendingReview' => (int) ($counts['pending_review'] ?? 0),
            'moreInfoRequested' => (int) ($counts['more_info_requested'] ?? 0),
            'approved' => (int) ($counts['approved'] ?? 0),
            'rejected' => (int) ($counts['rejected'] ?? 0),
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function documentMetrics(?array $compoundIds, ?string $from, ?string $to): array
    {
        $counts = DB::table('user_documents as ud')
            ->join('users as u', 'u.id', '=', 'ud.user_id')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('u.compound_id', $compoundIds))
            ->when($from, fn ($q) => $q->where('ud.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('ud.created_at', '<=', $to))
            ->select('ud.status', DB::raw('count(*) as count'))
            ->groupBy('ud.status')
            ->pluck('count', 'ud.status');

        return [
            'total' => (int) $counts->sum(),
            'submitted' => (int) ($counts['submitted'] ?? 0),
            'approved' => (int) ($counts['approved'] ?? 0),
            'rejected' => (int) ($counts['rejected'] ?? 0),
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function visitorMetrics(?array $compoundIds, ?string $buildingId, ?string $from, ?string $to): array
    {
        $counts = DB::table('visitor_requests as vr')
            ->join('units', 'units.id', '=', 'vr.unit_id')
            ->join('buildings', 'buildings.id', '=', 'units.building_id')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('buildings.compound_id', $compoundIds))
            ->when($buildingId, fn ($q) => $q->where('buildings.id', $buildingId))
            ->when($from, fn ($q) => $q->where('vr.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('vr.created_at', '<=', $to))
            ->select('vr.status', DB::raw('count(*) as count'))
            ->groupBy('vr.status')
            ->pluck('count', 'vr.status');

        return [
            'total' => (int) $counts->sum(),
            'pending' => (int) ($counts['pending'] ?? 0),
            'allowed' => (int) ($counts['allowed'] ?? 0),
            'denied' => (int) ($counts['denied'] ?? 0),
            'completed' => (int) ($counts['completed'] ?? 0),
            'cancelled' => (int) ($counts['cancelled'] ?? 0),
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function issueMetrics(?array $compoundIds, ?string $buildingId, ?string $from, ?string $to): array
    {
        $counts = DB::table('issues')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->when($buildingId, fn ($q) => $q->where('building_id', $buildingId))
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        return [
            'total' => (int) $counts->sum(),
            'new' => (int) ($counts['new'] ?? 0),
            'inProgress' => (int) ($counts['in_progress'] ?? 0),
            'escalated' => (int) ($counts['escalated'] ?? 0),
            'resolved' => (int) ($counts['resolved'] ?? 0),
            'closed' => (int) ($counts['closed'] ?? 0),
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function announcementMetrics(?array $compoundIds, ?string $from, ?string $to): array
    {
        $base = DB::table('announcements')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to));

        $counts = (clone $base)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        // Acknowledgement tracking: only for published announcements requiring ack.
        $requiresAckIds = (clone $base)
            ->where('requires_acknowledgement', true)
            ->where('status', 'published')
            ->pluck('id');

        $ackCount = $requiresAckIds->isNotEmpty()
            ? DB::table('announcement_acknowledgements')
                ->whereIn('announcement_id', $requiresAckIds)
                ->count()
            : 0;

        return [
            'total' => (int) $counts->sum(),
            'draft' => (int) ($counts['draft'] ?? 0),
            'published' => (int) ($counts['published'] ?? 0),
            'archived' => (int) ($counts['archived'] ?? 0),
            'requiresAckCount' => $requiresAckIds->count(),
            'ackCount' => $ackCount,
        ];
    }

    /** @param list<string>|null $compoundIds */
    private function voteMetrics(?array $compoundIds, ?string $buildingId, ?string $from, ?string $to): array
    {
        $base = DB::table('votes')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->when($buildingId, fn ($q) => $q->where('building_id', $buildingId))
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to));

        $counts = (clone $base)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $voteIds = (clone $base)->pluck('id');

        $participationCount = $voteIds->isNotEmpty()
            ? DB::table('vote_participations')->whereIn('vote_id', $voteIds)->count()
            : 0;

        return [
            'total' => (int) $counts->sum(),
            'draft' => (int) ($counts['draft'] ?? 0),
            'active' => (int) ($counts['active'] ?? 0),
            'closed' => (int) ($counts['closed'] ?? 0),
            'cancelled' => (int) ($counts['cancelled'] ?? 0),
            'participations' => $participationCount,
        ];
    }
}
