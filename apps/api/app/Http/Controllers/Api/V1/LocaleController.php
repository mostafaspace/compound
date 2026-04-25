<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CompoundContextService;
use App\Support\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Returns the effective localization settings for the current compound.
 *
 * Accessible to all authenticated users — residents need locale data
 * for client-side date / currency formatting.
 */
class LocaleController extends Controller
{
    public function __construct(
        protected SettingsService $settings,
        protected CompoundContextService $compoundContext,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $compoundId = $this->compoundContext->resolve($request);

        $data = $this->settings->getNamespace('localization', $compoundId);

        return response()->json([
            'data' => array_merge(
                ['compoundId' => $compoundId],
                $data,
            ),
        ]);
    }
}
