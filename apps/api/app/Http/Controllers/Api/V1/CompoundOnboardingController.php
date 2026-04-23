<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CompoundStatus;
use App\Http\Controllers\Controller;
use App\Models\Announcements\Announcement;
use App\Models\CompoundSetting;
use App\Models\Finance\UnitAccount;
use App\Models\Governance\Vote;
use App\Models\Issues\Issue;
use App\Models\Property\Compound;
use App\Models\ResidentInvitation;
use App\Models\VerificationRequest;
use App\Models\Visitors\VisitorRequest;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompoundOnboardingController extends Controller
{
    public function __construct(private readonly CompoundContextService $compoundContext) {}

    /**
     * Return the onboarding checklist state for a compound.
     *
     * Checklist items:
     *  1. compound_activated   — compound status is "active"
     *  2. settings_configured  — at least one per-compound setting override exists
     *  3. has_buildings        — at least one building belongs to this compound
     *  4. has_units            — at least one unit exists under its buildings
     *  5. residents_invited    — at least one resident invitation was created for a unit in this compound
     *  6. first_resident_verified — at least one verification request was approved for this compound
     *  7. first_finance_account — at least one unit account exists for a unit in this compound
     *  8. first_announcement   — at least one announcement tagged to this compound
     */
    public function __invoke(Request $request, Compound $compound): JsonResponse
    {
        $this->compoundContext->ensureCompoundAccess($request, $compound->id);

        $buildingsExist = $compound->buildings()->exists();
        $unitsExist = $buildingsExist && $compound->units()->exists();

        $residentsInvited = ResidentInvitation::query()
            ->whereHas('unit', fn ($q) => $q->where('compound_id', $compound->id))
            ->exists();

        $firstResidentVerified = VerificationRequest::query()
            ->where('status', 'approved')
            ->whereHas('unit', fn ($q) => $q->where('compound_id', $compound->id))
            ->exists();

        $firstFinanceAccount = UnitAccount::query()
            ->whereHas('unit', fn ($q) => $q->where('compound_id', $compound->id))
            ->exists();

        $firstAnnouncement = Announcement::query()
            ->where('compound_id', $compound->id)
            ->exists();

        $settingsConfigured = CompoundSetting::query()
            ->where('compound_id', $compound->id)
            ->exists();

        $steps = [
            [
                'key'       => 'compound_activated',
                'label'     => 'Compound is active',
                'completed' => $compound->status === CompoundStatus::Active,
            ],
            [
                'key'       => 'settings_configured',
                'label'     => 'Default settings configured',
                'completed' => $settingsConfigured,
            ],
            [
                'key'       => 'has_buildings',
                'label'     => 'At least one building added',
                'completed' => $buildingsExist,
            ],
            [
                'key'       => 'has_units',
                'label'     => 'At least one unit added',
                'completed' => $unitsExist,
            ],
            [
                'key'       => 'residents_invited',
                'label'     => 'First resident invited',
                'completed' => $residentsInvited,
            ],
            [
                'key'       => 'first_resident_verified',
                'label'     => 'First resident verified',
                'completed' => $firstResidentVerified,
            ],
            [
                'key'       => 'first_finance_account',
                'label'     => 'First unit finance account created',
                'completed' => $firstFinanceAccount,
            ],
            [
                'key'       => 'first_announcement',
                'label'     => 'First announcement published',
                'completed' => $firstAnnouncement,
            ],
        ];

        $completedCount = count(array_filter($steps, fn ($s) => $s['completed']));
        $totalCount = count($steps);

        return response()->json([
            'data' => [
                'compoundId'     => $compound->id,
                'compoundName'   => $compound->name,
                'completedSteps' => $completedCount,
                'totalSteps'     => $totalCount,
                'percentComplete' => $totalCount > 0 ? round($completedCount / $totalCount * 100) : 0,
                'steps'          => $steps,
            ],
        ]);
    }
}
