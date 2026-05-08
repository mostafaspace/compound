<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingMinutes;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Meeting minutes – write, update, publish
class MeetingMinutesController extends Controller
{
    public function show(Meeting $meeting): JsonResponse
    {
        $minutes = $meeting->minutes()->with(['author', 'lastEditor'])->first();
        abort_if($minutes === null, 404, 'Minutes not yet written for this meeting.');

        return response()->json(['data' => $minutes]);
    }

    public function store(Request $request, Meeting $meeting): JsonResponse
    {
        abort_if($meeting->status === 'cancelled', 422, 'Cannot write minutes for a cancelled meeting.');
        abort_if($meeting->minutes()->exists(), 422, 'Minutes already exist. Use PATCH to update.');

        $validated = $request->validate([
            'body' => ['required', 'string'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $minutes = MeetingMinutes::create([
            'meeting_id' => $meeting->id,
            'body' => $validated['body'],
            'created_by' => $user->id,
        ]);

        return response()->json(['data' => $minutes->load(['author'])], 201);
    }

    public function update(Request $request, Meeting $meeting): JsonResponse
    {
        $minutes = $meeting->minutes()->firstOrFail();

        $validated = $request->validate([
            'body' => ['required', 'string'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $minutes->update([
            'body' => $validated['body'],
            'updated_by' => $user->id,
        ]);

        return response()->json(['data' => $minutes->fresh()->load(['author', 'lastEditor'])]);
    }

    public function publish(Request $request, Meeting $meeting): JsonResponse
    {
        $minutes = $meeting->minutes()->firstOrFail();
        abort_if($minutes->published_at !== null, 422, 'Minutes are already published.');

        $minutes->update(['published_at' => now()]);

        return response()->json(['data' => $minutes->fresh()->load(['author'])]);
    }
}
