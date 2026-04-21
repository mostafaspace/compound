<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueRequest;
use App\Http\Requests\Issues\UpdateIssueRequest;
use App\Models\Issues\Issue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IssueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Issue::with(['reporter', 'assignee', 'unit', 'building'])
            ->latest();

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->has('building_id')) {
            $query->where('building_id', $request->input('building_id'));
        }

        return match ($request->input('paginate', 'true')) {
            'false' => response()->json(['data' => $query->get()]),
            default => response()->json($query->paginate(20)),
        };
    }

    public function myIssues(Request $request): JsonResponse
    {
        $issues = Issue::with(['assignee', 'unit', 'building'])
            ->where('reported_by', $request->user()?->id)
            ->latest()
            ->get();

        return response()->json(['data' => $issues]);
    }

    public function store(StoreIssueRequest $request): JsonResponse
    {
        $location = $request->resolveLocationAndQueue();

        $issue = Issue::create([
            'compound_id' => $location['compound_id'],
            'building_id' => $location['building_id'],
            'unit_id' => $request->input('unitId'),
            'reported_by' => $request->user()?->id,
            'assigned_to' => $location['assigned_to'],
            'category' => $request->input('category'),
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'priority' => $request->input('priority', 'normal'),
            'status' => 'new',
        ]);

        return response()->json([
            'data' => $issue->load(['reporter', 'assignee', 'unit', 'building'])
        ], 201);
    }

    public function show(Issue $issue): JsonResponse
    {
        return response()->json([
            'data' => $issue->load(['reporter', 'assignee', 'unit', 'building', 'comments.user'])
        ]);
    }

    public function update(UpdateIssueRequest $request, Issue $issue): JsonResponse
    {
        if ($request->has('status')) {
            $issue->status = $request->input('status');
            if ($issue->status === 'resolved' || $issue->status === 'closed') {
                $issue->resolved_at = $issue->resolved_at ?? now();
            } else {
                $issue->resolved_at = null;
            }
        }

        if ($request->has('priority')) {
            $issue->priority = $request->input('priority');
        }

        if ($request->has('assignedTo')) {
            $issue->assigned_to = $request->input('assignedTo');
        }

        if ($request->has('categoryId')) {
            $issue->category = $request->input('categoryId');
        }

        $issue->save();

        return response()->json([
            'data' => $issue->load(['reporter', 'assignee', 'unit', 'building'])
        ]);
    }
}
