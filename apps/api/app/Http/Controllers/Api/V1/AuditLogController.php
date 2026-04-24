<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function __construct(private readonly CompoundContextService $compoundContext) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:160'],
            'actorId' => ['nullable', 'integer', 'min:1'],
            'from' => ['nullable', 'date'],
            'method' => ['nullable', 'string', 'max:10'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
            'q' => ['nullable', 'string', 'max:160'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = AuditLog::query()
            ->with('actor')
            ->when($this->compoundContext->resolve($request) !== null, function ($builder) use ($request): void {
                /** @var User $user */
                $user = $request->user();
                $compoundId = $user->compound_id;

                $builder->where(function ($scoped) use ($compoundId): void {
                    $scoped
                        ->whereHas('actor', fn ($actorQuery) => $actorQuery->where('compound_id', $compoundId))
                        ->orWhere('metadata->compound_id', $compoundId)
                        ->orWhere('metadata->compoundId', $compoundId);
                });
            })
            ->when($validated['action'] ?? null, fn ($builder, string $action) => $builder->where('action', $action))
            ->when($validated['actorId'] ?? null, fn ($builder, int $actorId) => $builder->where('actor_id', $actorId))
            ->when($validated['method'] ?? null, fn ($builder, string $method) => $builder->where('method', $method))
            ->when($validated['from'] ?? null, fn ($builder, string $from) => $builder->whereDate('created_at', '>=', $from))
            ->when($validated['to'] ?? null, fn ($builder, string $to) => $builder->whereDate('created_at', '<=', $to))
            ->when($validated['q'] ?? null, function ($builder, string $search): void {
                $term = '%'.$search.'%';

                $builder->where(function ($inner) use ($term): void {
                    $inner
                        ->where('action', 'like', $term)
                        ->orWhere('path', 'like', $term)
                        ->orWhere('auditable_type', 'like', $term)
                        ->orWhere('auditable_id', 'like', $term)
                        ->orWhere('ip_address', 'like', $term);
                });
            })
            ->latest();

        return AuditLogResource::collection($query->paginate(
            perPage: $validated['perPage'] ?? 25,
        ));
    }
}
