<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OperationalStatusService;
use Illuminate\Http\JsonResponse;

class SystemStatusController extends Controller
{
    public function __construct(private readonly OperationalStatusService $operationalStatusService) {}

    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => $this->operationalStatusService->publicStatus(),
        ]);
    }
}
