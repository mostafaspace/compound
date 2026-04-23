<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OperationalStatusService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperationalStatusController extends Controller
{
    public function __construct(
        private readonly OperationalStatusService $operationalStatusService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $status = $this->operationalStatusService->operatorStatus();

        $this->auditLogger->record(
            action: 'system.ops_status_viewed',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            metadata: [
                'overall_status' => $status['status'],
                'failed_jobs' => $status['checks']['queue']['failedJobs'] ?? null,
            ],
        );

        return response()->json([
            'data' => $status,
        ]);
    }
}
