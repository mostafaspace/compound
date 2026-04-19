<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class SystemStatusController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'service' => 'compound-api',
                'status' => 'ok',
                'environment' => app()->environment(),
                'timezone' => config('app.timezone'),
            ],
        ]);
    }
}
