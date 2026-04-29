<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditSeverity;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function __construct(private readonly CompoundContextService $compoundContext) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'action'        => ['nullable', 'string', 'max:160'],
            'actorId'       => ['nullable', 'integer', 'min:1'],
            'from'          => ['nullable', 'date'],
            'method'        => ['nullable', 'string', 'max:10'],
            'module'        => ['nullable', 'string', 'max:80'],
            'severity'      => ['nullable', 'string', 'in:info,warning,critical'],
            'auditableType' => ['nullable', 'string', 'max:200'],
            'auditableId'   => ['nullable', 'string', 'max:200'],
            'perPage'       => ['nullable', 'integer', 'min:1', 'max:100'],
            'q'             => ['nullable', 'string', 'max:160'],
            'to'            => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = $this->buildBaseQuery($request, $validated);

        return AuditLogResource::collection($query->paginate(
            perPage: $validated['perPage'] ?? 25,
        ));
    }

    /**
     * Investigation timeline: all events related to a specific entity (auditable_type + auditable_id).
     */
    public function timeline(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'entity_type' => ['required', 'string', 'max:200'],
            'entity_id'   => ['required', 'string', 'max:200'],
        ]);

        $compoundId = $this->compoundContext->resolve($request);

        $query = AuditLog::query()
            ->with('actor')
            ->where('auditable_type', $validated['entity_type'])
            ->where('auditable_id', $validated['entity_id'])
            ->when($compoundId !== null, function ($builder) use ($compoundId): void {
                $builder->where(function ($scoped) use ($compoundId): void {
                    $scoped
                        ->whereHas('actor', fn ($q) => $this->scopeUsersToCompound($q, $compoundId))
                        ->orWhere('metadata->compound_id', $compoundId)
                        ->orWhere('metadata->compoundId', $compoundId);
                });
            })
            ->oldest();

        return AuditLogResource::collection($query->paginate(100));
    }

    /**
     * Export audit logs as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'action'        => ['nullable', 'string', 'max:160'],
            'actorId'       => ['nullable', 'integer', 'min:1'],
            'from'          => ['nullable', 'date'],
            'method'        => ['nullable', 'string', 'max:10'],
            'module'        => ['nullable', 'string', 'max:80'],
            'severity'      => ['nullable', 'string', 'in:info,warning,critical'],
            'auditableType' => ['nullable', 'string', 'max:200'],
            'auditableId'   => ['nullable', 'string', 'max:200'],
            'q'             => ['nullable', 'string', 'max:160'],
            'to'            => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        /** @var User $reviewer */
        $reviewer    = $request->user();
        $generatedAt = now()->toIso8601String();
        $filename    = 'audit-export-'.now()->format('Y-m-d-His').'.csv';

        $query = $this->buildBaseQuery($request, $validated);

        return response()->streamDownload(function () use ($query, $reviewer, $generatedAt): void {
            $handle = fopen('php://output', 'w');

            // Export metadata header rows (tamper-evident audit trail of the export itself)
            fputcsv($handle, ['# Audit Log Export']);
            fputcsv($handle, ['# Generated', $generatedAt]);
            fputcsv($handle, ['# Reviewer', $reviewer->name]);
            fputcsv($handle, ['# Reviewer ID', $reviewer->id]);
            fputcsv($handle, []);

            // Column headers
            fputcsv($handle, [
                'ID', 'Timestamp', 'Actor ID', 'Actor Name', 'Action',
                'Severity', 'Reason', 'Auditable Type', 'Auditable ID',
                'Method', 'Path', 'IP Address', 'Status Code', 'Metadata',
            ]);

            $query->chunk(500, function ($logs) use ($handle): void {
                foreach ($logs as $log) {
                    fputcsv($handle, [
                        $log->id,
                        $log->created_at?->toIso8601String(),
                        $log->actor_id ?? '',
                        $log->actor?->name ?? '',
                        $log->action,
                        $log->severity?->value ?? 'info',
                        $log->reason ?? '',
                        $log->auditable_type ?? '',
                        $log->auditable_id ?? '',
                        $log->method ?? '',
                        $log->path ?? '',
                        $log->ip_address ?? '',
                        $log->status_code ?? '',
                        json_encode($log->metadata ?? []),
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function buildBaseQuery(Request $request, array $validated): \Illuminate\Database\Eloquent\Builder
    {
        $compoundId = $this->compoundContext->resolve($request);

        return AuditLog::query()
            ->with('actor')
            ->when($compoundId !== null, function ($builder) use ($compoundId): void {
                $builder->where(function ($scoped) use ($compoundId): void {
                    $scoped
                        ->whereHas('actor', fn ($actorQuery) => $this->scopeUsersToCompound($actorQuery, $compoundId))
                        ->orWhere('metadata->compound_id', $compoundId)
                        ->orWhere('metadata->compoundId', $compoundId);
                });
            })
            ->when($validated['action'] ?? null, fn ($b, string $v) => $b->where('action', $v))
            ->when($validated['actorId'] ?? null, fn ($b, int $v) => $b->where('actor_id', $v))
            ->when($validated['method'] ?? null, fn ($b, string $v) => $b->where('method', $v))
            ->when($validated['severity'] ?? null, fn ($b, string $v) => $b->where('severity', $v))
            ->when($validated['module'] ?? null, fn ($b, string $v) => $b->where('action', 'like', $v.'.%'))
            ->when($validated['auditableType'] ?? null, fn ($b, string $v) => $b->where('auditable_type', $v))
            ->when($validated['auditableId'] ?? null, fn ($b, string $v) => $b->where('auditable_id', $v))
            ->when($validated['from'] ?? null, fn ($b, string $v) => $b->whereDate('created_at', '>=', $v))
            ->when($validated['to'] ?? null, fn ($b, string $v) => $b->whereDate('created_at', '<=', $v))
            ->when($validated['q'] ?? null, function ($builder, string $search): void {
                $term = '%'.$search.'%';

                $builder->where(function ($inner) use ($term): void {
                    $inner
                        ->where('action', 'like', $term)
                        ->orWhere('path', 'like', $term)
                        ->orWhere('auditable_type', 'like', $term)
                        ->orWhere('auditable_id', 'like', $term)
                        ->orWhere('ip_address', 'like', $term)
                        ->orWhere('reason', 'like', $term);
                });
            })
            ->latest();
    }

    private function scopeUsersToCompound($query, string $compoundId): void
    {
        $query->where(function ($scoped) use ($compoundId): void {
            $scoped
                ->where('compound_id', $compoundId)
                ->orWhereHas('unitMemberships.unit', fn ($unitQuery) => $unitQuery->where('compound_id', $compoundId));
        });
    }
}
