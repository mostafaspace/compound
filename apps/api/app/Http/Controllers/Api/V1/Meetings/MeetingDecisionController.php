<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingDecision;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Meeting decisions
class MeetingDecisionController extends Controller
{
    public function store(Request $request, Meeting $meeting): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:3000'],
            'linkedType' => ['nullable', 'string', 'max:60'],
            'linkedId' => ['nullable', 'string', 'max:26'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $decision = MeetingDecision::create([
            'meeting_id' => $meeting->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'linked_type' => $validated['linkedType'] ?? null,
            'linked_id' => $validated['linkedId'] ?? null,
            'created_by' => $user->id,
        ]);

        return response()->json(['data' => $decision->load('creator')], 201);
    }

    public function destroy(Meeting $meeting, MeetingDecision $decision): JsonResponse
    {
        abort_if((int) $decision->meeting_id !== (int) $meeting->agendaItems()->getModel()->getKey() && $decision->meeting_id !== $meeting->id, 404);

        $decision->delete();

        return response()->json(null, 204);
    }
}
