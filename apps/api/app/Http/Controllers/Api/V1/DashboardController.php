<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Issues\Issue;
use App\Models\Property\UnitMembership;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use App\Services\CompoundContextService;
use App\Services\IssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * @var list<string>
     */
    private const ASSIGNABLE_RESIDENT_ROLES = [
        UserRole::Resident->value,
        UserRole::ResidentOwner->value,
        UserRole::ResidentTenant->value,
    ];

    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly IssueService $issueService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $compoundId = $this->compoundContext->resolveManagedCompoundId($user);

        $data = [
            'role' => $user->effective_role,
            'attentionItems' => $this->getAttentionItems($user, $compoundId),
            'shortcuts' => $this->getShortcuts($user),
            'stats' => $this->getStats($user, $compoundId),
        ];

        return response()->json(['data' => $data]);
    }

    /**
     * @return list<array{type: string, label: string, count: int, route: string}>
     */
    private function getAttentionItems(User $user, ?string $compoundId): array
    {
        $items = [];

        if ($user->hasAnyEffectiveRole([UserRole::SuperAdmin, UserRole::CompoundAdmin, UserRole::President])) {
            $openIssues = Issue::query()
                ->when($compoundId, fn ($q) => $q->where('compound_id', $compoundId))
                ->whereIn('status', ['new', 'open', 'escalated'])
                ->count();

            if ($openIssues > 0) {
                $items[] = [
                    'type' => 'issues',
                    'label' => 'Open complaints need attention',
                    'count' => $openIssues,
                    'route' => '/issues?status=open',
                ];
            }

            $pendingVisitors = VisitorRequest::query()
                ->when($compoundId, fn ($q) => $q->whereHas('unit', fn ($uq) => $uq->where('compound_id', $compoundId)))
                ->where('status', 'pending')
                ->count();

            if ($pendingVisitors > 0) {
                $items[] = [
                    'type' => 'visitors',
                    'label' => 'Pending visitor requests',
                    'count' => $pendingVisitors,
                    'route' => '/visitors?status=pending',
                ];
            }

            $unassignedUsers = User::query()
                ->whereDoesntHave('unitMemberships', fn ($q) => $q->whereNull('ends_at'))
                ->when($compoundId, fn ($q) => $q->where('compound_id', $compoundId))
                ->where(function ($query): void {
                    $query
                        ->whereIn('role', self::ASSIGNABLE_RESIDENT_ROLES)
                        ->orWhereHas('roles', fn ($roles) => $roles->whereIn('name', self::ASSIGNABLE_RESIDENT_ROLES));
                })
                ->count();

            if ($unassignedUsers > 0) {
                $items[] = [
                    'type' => 'unassigned',
                    'label' => 'Users without apartment assignment',
                    'count' => $unassignedUsers,
                    'route' => '/units/assign',
                ];
            }
        }

        // Floor/Building reps see their scoped issues
        $repAssignment = RepresentativeAssignment::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNull('ends_at')
            ->first();

        if ($repAssignment) {
            $scopedIssues = Issue::query()
                ->when($compoundId, fn ($q) => $q->where('compound_id', $compoundId))
                ->when($repAssignment->building_id, fn ($q) => $q->where('building_id', $repAssignment->building_id))
                ->whereIn('status', ['new', 'open'])
                ->count();

            if ($scopedIssues > 0 && ! in_array(['type' => 'issues'], array_column($items, 'type'))) {
                $items[] = [
                    'type' => 'issues',
                    'label' => 'Complaints in your area',
                    'count' => $scopedIssues,
                    'route' => '/issues',
                ];
            }
        }

        return $items;
    }

    /**
     * @return list<array{key: string, label: string, route: string, icon: string}>
     */
    private function getShortcuts(User $user): array
    {
        $shortcuts = [];

        if ($user->hasAnyEffectiveRole([UserRole::SuperAdmin, UserRole::CompoundAdmin])) {
            $shortcuts = [
                ['key' => 'addUser', 'label' => 'Add User', 'route' => '/users/invite', 'icon' => 'user-plus'],
                ['key' => 'assignApartment', 'label' => 'Assign Apartment', 'route' => '/units/assign', 'icon' => 'home'],
                ['key' => 'orgChart', 'label' => 'Org Chart', 'route' => '/org-chart', 'icon' => 'sitemap'],
                ['key' => 'createPoll', 'label' => 'Create Poll', 'route' => '/polls/create', 'icon' => 'bar-chart'],
                ['key' => 'visitorLog', 'label' => 'QR Visitor Log', 'route' => '/visitors', 'icon' => 'qr-code'],
                ['key' => 'complaints', 'label' => 'Complaints', 'route' => '/issues', 'icon' => 'alert-circle'],
            ];
        } elseif ($user->hasEffectiveRole(UserRole::President)) {
            $shortcuts = [
                ['key' => 'complaints', 'label' => 'View Complaints', 'route' => '/issues', 'icon' => 'alert-circle'],
                ['key' => 'visitorLog', 'label' => 'Visitor Log', 'route' => '/visitors', 'icon' => 'qr-code'],
                ['key' => 'orgChart', 'label' => 'Org Chart', 'route' => '/org-chart', 'icon' => 'sitemap'],
                ['key' => 'polls', 'label' => 'Polls', 'route' => '/polls', 'icon' => 'bar-chart'],
            ];
        } elseif ($user->hasEffectiveRole(UserRole::SecurityGuard)) {
            $shortcuts = [
                ['key' => 'scanner', 'label' => 'QR Scanner', 'route' => '/security/scanner', 'icon' => 'scan'],
                ['key' => 'entryHistory', 'label' => 'Entry History', 'route' => '/security/entries', 'icon' => 'clock'],
                ['key' => 'manualEntry', 'label' => 'Log Manual Entry', 'route' => '/security/manual-entry', 'icon' => 'edit'],
            ];
        } else {
            // Resident shortcuts
            $shortcuts = [
                ['key' => 'inviteGuest', 'label' => 'Invite Guest', 'route' => '/visitors/create', 'icon' => 'user-plus'],
                ['key' => 'reportIssue', 'label' => 'Report Issue', 'route' => '/issues/create', 'icon' => 'alert-circle'],
                ['key' => 'polls', 'label' => 'Polls & Voting', 'route' => '/polls', 'icon' => 'bar-chart'],
                ['key' => 'orgChart', 'label' => 'Org Chart', 'route' => '/org-chart', 'icon' => 'sitemap'],
            ];
        }

        return $shortcuts;
    }

    /**
     * @return array<string, int>
     */
    private function getStats(User $user, ?string $compoundId): array
    {
        $stats = [];

        if ($user->hasAnyEffectiveRole([UserRole::SuperAdmin, UserRole::CompoundAdmin, UserRole::President])) {
            $stats['totalResidents'] = UnitMembership::query()
                ->whereNull('ends_at')
                ->when($compoundId, fn ($q) => $q->whereHas('unit', fn ($uq) => $uq->where('compound_id', $compoundId)))
                ->count();

            $stats['activeVisitors'] = VisitorRequest::query()
                ->when($compoundId, fn ($q) => $q->whereHas('unit', fn ($uq) => $uq->where('compound_id', $compoundId)))
                ->whereIn('status', ['pending', 'allowed', 'arrived'])
                ->count();

            $stats['openIssues'] = Issue::query()
                ->when($compoundId, fn ($q) => $q->where('compound_id', $compoundId))
                ->whereIn('status', ['new', 'open', 'in_progress', 'escalated'])
                ->count();
        }

        return $stats;
    }
}
