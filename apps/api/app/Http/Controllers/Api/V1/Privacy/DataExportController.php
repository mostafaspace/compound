<?php

namespace App\Http\Controllers\Api\V1\Privacy;

use App\Http\Controllers\Controller;
use App\Models\Privacy\DataExportRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-84 / CM-121: Data export requests
class DataExportController extends Controller
{
    /** Admin: list all export requests */
    public function index(): JsonResponse
    {
        $requests = DataExportRequest::with(['requester', 'subject', 'processor'])
            ->latest()
            ->paginate(20);

        return response()->json(['data' => $requests]);
    }

    /** Create a data export request (self or admin for another user) */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'userId' => ['nullable', 'integer', 'exists:users,id'],
            'modules' => ['nullable', 'array'],
            'modules.*' => ['string', 'in:profile,finance,visitors,documents,votes,issues,notifications,audit'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        /** @var User $actor */
        $actor = $request->user();

        // If no userId specified, export is for self; admins can specify another user
        $subjectId = $validated['userId'] ?? $actor->id;

        $exportRequest = DataExportRequest::create([
            'requested_by' => $actor->id,
            'user_id' => $subjectId,
            'status' => 'pending',
            'modules' => $validated['modules'] ?? ['profile', 'finance', 'visitors', 'documents', 'votes', 'issues', 'notifications'],
            'notes' => $validated['notes'] ?? null,
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json(['data' => $exportRequest->load(['requester', 'subject'])], 201);
    }

    /** Get status of a specific export request */
    public function show(DataExportRequest $dataExportRequest): JsonResponse
    {
        return response()->json(['data' => $dataExportRequest->load(['requester', 'subject', 'processor'])]);
    }

    /** Admin: mark export request as ready (simulate package generation) */
    public function process(Request $request, DataExportRequest $dataExportRequest): JsonResponse
    {
        abort_if($dataExportRequest->status !== 'pending', 422, 'Export request is not in pending state.');

        $validated = $request->validate([
            'packagePath' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        /** @var User $actor */
        $actor = $request->user();

        $dataExportRequest->update([
            'status' => 'ready',
            'package_path' => $validated['packagePath'] ?? null,
            'processed_by' => $actor->id,
            'processed_at' => now(),
            'notes' => $validated['notes'] ?? $dataExportRequest->notes,
        ]);

        return response()->json(['data' => $dataExportRequest->fresh()->load(['requester', 'subject', 'processor'])]);
    }
}
