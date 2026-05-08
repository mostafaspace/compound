<?php

namespace App\Http\Controllers\Api\V1\Polls;

use App\Http\Controllers\Controller;
use App\Http\Resources\Polls\PollTypeResource;
use App\Models\Polls\PollType;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PollTypeController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'compoundId' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $query = PollType::query()->orderBy('sort_order')->orderBy('name');
        $compoundId = $this->compoundContext->resolve($request);

        // Scope to compound: admins locked to their compound see compound + global types
        if ($compoundId !== null) {
            if (isset($validated['compoundId']) && $validated['compoundId'] !== $compoundId) {
                abort(403);
            }

            $query->where(function ($q) use ($compoundId): void {
                $q->where('compound_id', $compoundId)->orWhereNull('compound_id');
            });
        } elseif (isset($validated['compoundId'])) {
            $query->where(function ($q) use ($validated): void {
                $q->where('compound_id', $validated['compoundId'])->orWhereNull('compound_id');
            });
        }

        return PollTypeResource::collection($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId' => ['nullable', 'string', 'exists:compounds,id'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'isActive' => ['nullable', 'boolean'],
            'sortOrder' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = $request->user();
        $validated['compoundId'] = $this->compoundContext->resolveManagedCompound(
            $request,
            $validated['compoundId'] ?? null,
            allowGlobalForSuperAdmin: true,
        );

        $pollType = PollType::create([
            'compound_id' => $validated['compoundId'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#14b8a6',
            'is_active' => $validated['isActive'] ?? true,
            'sort_order' => $validated['sortOrder'] ?? 0,
            'created_by' => $user->id,
        ]);

        return response()->json(['data' => PollTypeResource::make($pollType)->resolve()], 201);
    }

    public function update(Request $request, PollType $pollType): PollTypeResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'isActive' => ['sometimes', 'boolean'],
            'sortOrder' => ['sometimes', 'integer', 'min:0'],
        ]);

        $user = $request->user();
        $this->ensurePollTypeAccess($request, $pollType);

        $pollType->update(array_filter([
            'name' => $validated['name'] ?? null,
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? null,
            'is_active' => $validated['isActive'] ?? null,
            'sort_order' => $validated['sortOrder'] ?? null,
        ], fn ($v) => ! is_null($v)));

        return PollTypeResource::make($pollType->fresh());
    }

    public function destroy(Request $request, PollType $pollType): JsonResponse
    {
        $this->ensurePollTypeAccess($request, $pollType);

        // Detach from polls (nullify FK) before deleting the type
        $pollType->polls()->update(['poll_type_id' => null]);
        $pollType->delete();

        return response()->json(null, 204);
    }

    private function ensurePollTypeAccess(Request $request, PollType $pollType): void
    {
        if ($pollType->compound_id === null) {
            $this->compoundContext->ensureGlobalCompoundAccess($request);

            return;
        }

        $this->compoundContext->ensureCompoundAccess($request, $pollType->compound_id);
    }
}
