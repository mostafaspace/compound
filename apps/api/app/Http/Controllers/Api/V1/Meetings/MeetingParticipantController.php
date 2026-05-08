<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingParticipant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Participant invitation + attendance confirmation
class MeetingParticipantController extends Controller
{
    public function index(Meeting $meeting): JsonResponse
    {
        return response()->json([
            'data' => $meeting->participants()->with('user')->get(),
        ]);
    }

    public function store(Request $request, Meeting $meeting): JsonResponse
    {
        abort_if($meeting->status === 'cancelled', 422, 'Cannot invite to a cancelled meeting.');

        $validated = $request->validate([
            'userIds' => ['required', 'array', 'min:1'],
            'userIds.*' => ['integer', 'exists:users,id'],
        ]);

        $invited = [];
        foreach ($validated['userIds'] as $userId) {
            $invited[] = MeetingParticipant::firstOrCreate(
                ['meeting_id' => $meeting->id, 'user_id' => $userId],
                ['rsvp_status' => 'pending', 'invited_at' => now()]
            );
        }

        return response()->json([
            'data' => collect($invited)->map(fn ($p) => $p->load('user')),
        ], 201);
    }

    public function confirmAttendance(Request $request, Meeting $meeting, MeetingParticipant $participant): JsonResponse
    {
        abort_if((string) $participant->meeting_id !== (string) $meeting->id, 404);

        $validated = $request->validate([
            'attended' => ['required', 'boolean'],
        ]);

        $participant->update([
            'attended' => $validated['attended'],
            'attendance_confirmed_at' => now(),
        ]);

        return response()->json(['data' => $participant->fresh()->load('user')]);
    }

    public function rsvp(Request $request, Meeting $meeting): JsonResponse
    {
        abort_if($meeting->status === 'cancelled', 422, 'Meeting is cancelled.');

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:accepted,declined'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $participant = MeetingParticipant::where('meeting_id', $meeting->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $participant->update(['rsvp_status' => $validated['status']]);

        return response()->json(['data' => $participant->fresh()->load('user')]);
    }
}
