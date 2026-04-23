<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function __construct(protected SettingsService $settings) {}

    /**
     * Return all known namespaces and their default shapes.
     */
    public function namespaces(): JsonResponse
    {
        $namespaces = SettingsService::namespaces();

        return response()->json(['data' => $namespaces]);
    }

    /**
     * Get all settings for a given namespace, optionally scoped to a compound.
     */
    public function show(Request $request, string $namespace): JsonResponse
    {
        $this->validateNamespace($namespace);

        $compoundId = $request->query('compoundId');

        $data = $this->settings->getNamespace($namespace, $compoundId ?: null);

        return response()->json([
            'data' => [
                'namespace'  => $namespace,
                'compoundId' => $compoundId ?: null,
                'settings'   => $data,
            ],
        ]);
    }

    /**
     * Bulk-update settings within a namespace.
     * Body: { settings: { key: value, ... }, compoundId?: string, reason?: string }
     */
    public function update(Request $request, string $namespace): JsonResponse
    {
        $this->validateNamespace($namespace);

        $validated = $request->validate([
            'settings'   => ['required', 'array'],
            'compoundId' => ['nullable', 'string', 'exists:compounds,id'],
            'reason'     => ['nullable', 'string', 'max:255'],
        ]);

        $compoundId = $validated['compoundId'] ?? null;
        $reason     = $validated['reason'] ?? null;

        $actor = $request->user();

        $this->settings->setMany(
            namespace: $namespace,
            values: $validated['settings'],
            compoundId: $compoundId,
            actor: $actor,
            request: $request,
            metadata: $reason ? ['reason' => $reason] : [],
        );

        $updated = $this->settings->getNamespace($namespace, $compoundId);

        return response()->json([
            'data' => [
                'namespace'  => $namespace,
                'compoundId' => $compoundId,
                'settings'   => $updated,
            ],
        ]);
    }

    /**
     * Abort with 422 if the namespace is not one of the known ones.
     */
    private function validateNamespace(string $namespace): void
    {
        if (! in_array($namespace, SettingsService::namespaces(), true)) {
            throw ValidationException::withMessages([
                'namespace' => ["Unknown settings namespace: {$namespace}"],
            ]);
        }
    }
}
