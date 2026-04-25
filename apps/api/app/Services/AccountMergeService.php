<?php

namespace App\Services;

use App\Enums\AccountMergeStatus;
use App\Enums\AccountStatus;
use App\Enums\AuditSeverity;
use App\Models\AccountMerge;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;

class AccountMergeService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * Build a dry-run analysis of what would be transferred in a merge.
     *
     * @return array<string, mixed>
     */
    public function analyze(User $source, User $target): array
    {
        $memberships = $source->unitMemberships()->with('unit')->get();
        $documents   = $source->documents()->count();
        $invitations = $source->residentInvitations()->count();
        $verifications = $source->verificationRequests()->count();

        $membershipSummary = $memberships->map(fn ($m) => [
            'unit_id'             => $m->unit_id,
            'unit_name'           => $m->unit?->name,
            'relation_type'       => $m->relation_type?->value,
            'verification_status' => $m->verification_status?->value,
            'starts_at'           => $m->starts_at?->toDateString(),
            'ends_at'             => $m->ends_at?->toDateString(),
        ])->all();

        // Check if target already has memberships for the same units (potential conflicts)
        $targetUnitIds = $target->unitMemberships()->pluck('unit_id')->all();
        $conflictingUnitIds = $memberships
            ->filter(fn ($m) => in_array($m->unit_id, $targetUnitIds))
            ->pluck('unit_id')
            ->all();

        return [
            'source_user'    => ['id' => $source->id, 'name' => $source->name, 'email' => $source->email],
            'target_user'    => ['id' => $target->id, 'name' => $target->name, 'email' => $target->email],
            'to_transfer'    => [
                'memberships'   => count($membershipSummary),
                'documents'     => $documents,
                'invitations'   => $invitations,
                'verifications' => $verifications,
            ],
            'memberships'        => $membershipSummary,
            'conflicting_units'  => $conflictingUnitIds,
            'warnings'           => count($conflictingUnitIds) > 0
                ? ['Target user already has memberships in '.count($conflictingUnitIds).' of the same units. Those memberships will be skipped.']
                : [],
        ];
    }

    /**
     * Execute the merge: transfer source→target, archive source.
     */
    public function execute(AccountMerge $merge, User $actor): void
    {
        if ($merge->status !== AccountMergeStatus::Pending) {
            abort(422, 'Only pending merges can be confirmed.');
        }

        $source = $merge->sourceUser;
        $target = $merge->targetUser;

        DB::transaction(function () use ($merge, $source, $target, $actor): void {
            $targetUnitIds = $target->unitMemberships()->pluck('unit_id')->all();

            // Transfer unit memberships (skip duplicates for same unit)
            $source->unitMemberships()
                ->whereNotIn('unit_id', $targetUnitIds)
                ->update(['user_id' => $target->id]);

            // Transfer documents
            $source->documents()->update(['user_id' => $target->id]);

            // Transfer resident invitations
            $source->residentInvitations()->update(['user_id' => $target->id]);

            // Transfer verification requests
            $source->verificationRequests()->update(['user_id' => $target->id]);

            // Transfer device tokens (deduplicate by token — skip if target already has same token)
            $targetTokens = DB::table('device_tokens')->where('user_id', $target->id)->pluck('token')->all();
            DB::table('device_tokens')
                ->where('user_id', $source->id)
                ->whereNotIn('token', $targetTokens)
                ->update(['user_id' => $target->id]);

            // Archive the source user — do NOT delete (history must be preserved)
            $source->update(['status' => AccountStatus::Archived]);

            // Complete the merge record
            $merge->update([
                'status'       => AccountMergeStatus::Completed,
                'completed_at' => now(),
            ]);
        });

        $this->auditLogger->record(
            'users.account_merge_completed',
            actor: $actor,
            auditableType: 'user',
            auditableId: (string) $source->id,
            severity: AuditSeverity::Critical,
            reason: "Source user #{$source->id} merged into target user #{$target->id}",
            metadata: [
                'source_user_id' => $source->id,
                'target_user_id' => $target->id,
                'merge_id'       => $merge->id,
            ],
        );
    }
}
