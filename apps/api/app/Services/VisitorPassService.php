<?php

namespace App\Services;

use App\Enums\VisitorPassStatus;
use App\Enums\VisitorRequestStatus;
use App\Enums\VisitorScanResult;
use App\Models\User;
use App\Models\Visitors\VisitorEventLog;
use App\Models\Visitors\VisitorPass;
use App\Models\Visitors\VisitorRequest;
use App\Models\Visitors\VisitorScanLog;
use Illuminate\Support\Str;

class VisitorPassService
{
    public function issuePass(VisitorRequest $visitorRequest): string
    {
        $token = Str::random(64);

        $visitorRequest->pass()->create([
            'token_hash' => $this->hashToken($token),
            'status' => VisitorPassStatus::Active->value,
            'expires_at' => $visitorRequest->visit_ends_at,
            'max_uses' => 1,
            'uses_count' => 0,
        ]);

        $this->transition($visitorRequest, VisitorRequestStatus::QrIssued, null, 'pass_issued');

        return $token;
    }

    public function validateToken(string $token, ?User $scanner = null, ?string $decision = null): array
    {
        $hash = $this->hashToken($token);
        $pass = VisitorPass::query()
            ->with(['visitorRequest.host', 'visitorRequest.unit.building.compound'])
            ->where('token_hash', $hash)
            ->first();

        if (! $pass) {
            $this->recordScan(null, null, $scanner, VisitorScanResult::NotFound, $decision, token: $token);

            return [
                'result' => VisitorScanResult::NotFound,
                'visitorRequest' => null,
            ];
        }

        $result = $this->resultForPass($pass);
        $pass->visitorRequest->setRelation('pass', $pass);
        $this->recordScan($pass->visitorRequest, $pass, $scanner, $result, $decision, token: $token);

        return [
            'result' => $result,
            'visitorRequest' => $pass->visitorRequest,
        ];
    }

    public function arrive(VisitorRequest $visitorRequest, User $actor): VisitorRequest
    {
        return $this->transition($visitorRequest, VisitorRequestStatus::Arrived, $actor, 'arrived');
    }

    public function allow(VisitorRequest $visitorRequest, User $actor): VisitorRequest
    {
        $visitorRequest = $this->transition($visitorRequest, VisitorRequestStatus::Allowed, $actor, 'allowed');
        $pass = $visitorRequest->pass;

        if ($pass && $pass->status === VisitorPassStatus::Active) {
            $usesCount = $pass->uses_count + 1;
            $pass->forceFill([
                'uses_count' => $usesCount,
                'last_used_at' => now(),
                'status' => $usesCount >= $pass->max_uses ? VisitorPassStatus::Used->value : VisitorPassStatus::Active->value,
            ])->save();
        }

        return $visitorRequest;
    }

    public function deny(VisitorRequest $visitorRequest, User $actor, ?string $reason = null): VisitorRequest
    {
        return $this->transition($visitorRequest, VisitorRequestStatus::Denied, $actor, 'denied', $reason);
    }

    public function complete(VisitorRequest $visitorRequest, User $actor): VisitorRequest
    {
        return $this->transition($visitorRequest, VisitorRequestStatus::Completed, $actor, 'completed');
    }

    public function cancel(VisitorRequest $visitorRequest, User $actor, ?string $reason = null): VisitorRequest
    {
        $visitorRequest = $this->transition($visitorRequest, VisitorRequestStatus::Cancelled, $actor, 'cancelled', $reason);

        if ($visitorRequest->pass) {
            $visitorRequest->pass->forceFill([
                'status' => VisitorPassStatus::Revoked->value,
                'revoked_at' => now(),
            ])->save();
        }

        return $visitorRequest;
    }

    public function transition(
        VisitorRequest $visitorRequest,
        VisitorRequestStatus $status,
        ?User $actor,
        string $eventType,
        ?string $reason = null,
    ): VisitorRequest {
        $fromStatus = $visitorRequest->status;
        $timestampColumn = match ($status) {
            VisitorRequestStatus::Arrived => 'arrived_at',
            VisitorRequestStatus::Allowed => 'allowed_at',
            VisitorRequestStatus::Denied => 'denied_at',
            VisitorRequestStatus::Completed => 'completed_at',
            VisitorRequestStatus::Cancelled => 'cancelled_at',
            default => null,
        };

        $updates = [
            'status' => $status->value,
        ];

        if ($timestampColumn) {
            $updates[$timestampColumn] = now();
        }

        if ($reason !== null) {
            $updates['decision_reason'] = $reason;
        }

        $visitorRequest->forceFill($updates)->save();

        VisitorEventLog::query()->create([
            'visitor_request_id' => $visitorRequest->id,
            'actor_id' => $actor?->id,
            'event_type' => $eventType,
            'from_status' => $fromStatus->value,
            'to_status' => $status->value,
            'reason' => $reason,
        ]);

        return $visitorRequest->refresh()->load(['host', 'unit.building.compound', 'pass']);
    }

    public function resultForPass(VisitorPass $pass): VisitorScanResult
    {
        $visitorRequest = $pass->visitorRequest;

        if ($visitorRequest->status === VisitorRequestStatus::Cancelled || $pass->status === VisitorPassStatus::Revoked) {
            return VisitorScanResult::Cancelled;
        }

        if ($visitorRequest->status === VisitorRequestStatus::Denied) {
            return VisitorScanResult::Denied;
        }

        if ($pass->status === VisitorPassStatus::Used || $pass->uses_count >= $pass->max_uses) {
            return VisitorScanResult::AlreadyUsed;
        }

        if ($pass->expires_at->isPast()) {
            $pass->forceFill(['status' => VisitorPassStatus::Expired->value])->save();

            return VisitorScanResult::Expired;
        }

        if (now()->lt($visitorRequest->visit_starts_at) || now()->gt($visitorRequest->visit_ends_at)) {
            return VisitorScanResult::OutOfWindow;
        }

        return VisitorScanResult::Valid;
    }

    private function recordScan(
        ?VisitorRequest $visitorRequest,
        ?VisitorPass $pass,
        ?User $scanner,
        VisitorScanResult $result,
        ?string $decision,
        ?string $reason = null,
        ?string $token = null,
    ): VisitorScanLog {
        return VisitorScanLog::query()->create([
            'visitor_request_id' => $visitorRequest?->id,
            'visitor_pass_id' => $pass?->id,
            'scanned_by' => $scanner?->id,
            'token_fingerprint' => $token ? substr($this->hashToken($token), 0, 16) : null,
            'result' => $result->value,
            'decision' => $decision,
            'reason' => $reason,
        ]);
    }

    private function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
