<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingAgendaItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Agenda item management
class MeetingAgendaController extends Controller
{
    public function store(Request $request, Meeting $meeting): JsonResponse
    {
        abort_if($meeting->status === 'cancelled', 422, 'Cannot edit agenda of a cancelled meeting.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'position' => ['nullable', 'integer', 'min:0'],
            'durationMinutes' => ['nullable', 'integer', 'min:5', 'max:240'],
            'presenterUserId' => ['nullable', 'integer', 'exists:users,id'],
            'linkedType' => ['nullable', 'string', 'max:60'],
            'linkedId' => ['nullable', 'string', 'max:26'],
        ]);

        // Auto-assign next position if not given
        $position = $validated['position'] ?? ($meeting->agendaItems()->max('position') + 1);

        $item = MeetingAgendaItem::create([
            'meeting_id' => $meeting->id,
            'position' => $position,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'duration_minutes' => $validated['durationMinutes'] ?? null,
            'presenter_user_id' => $validated['presenterUserId'] ?? null,
            'linked_type' => $validated['linkedType'] ?? null,
            'linked_id' => $validated['linkedId'] ?? null,
        ]);

        return response()->json(['data' => $item->load('presenter')], 201);
    }

    public function update(Request $request, Meeting $meeting, MeetingAgendaItem $agendaItem): JsonResponse
    {
        abort_if((string) $agendaItem->meeting_id !== (string) $meeting->id, 404);
        abort_if($meeting->status === 'cancelled', 422, 'Cannot edit agenda of a cancelled meeting.');

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'position' => ['nullable', 'integer', 'min:0'],
            'durationMinutes' => ['nullable', 'integer', 'min:5', 'max:240'],
            'presenterUserId' => ['nullable', 'integer', 'exists:users,id'],
            'linkedType' => ['nullable', 'string', 'max:60'],
            'linkedId' => ['nullable', 'string', 'max:26'],
        ]);

        $changes = [];
        foreach ([
            'title' => 'title',
            'description' => 'description',
            'position' => 'position',
            'durationMinutes' => 'duration_minutes',
            'presenterUserId' => 'presenter_user_id',
            'linkedType' => 'linked_type',
            'linkedId' => 'linked_id',
        ] as $in => $db) {
            if (array_key_exists($in, $validated)) {
                $changes[$db] = $validated[$in];
            }
        }

        $agendaItem->update($changes);

        return response()->json(['data' => $agendaItem->fresh()->load('presenter')]);
    }

    public function destroy(Meeting $meeting, MeetingAgendaItem $agendaItem): JsonResponse
    {
        abort_if((string) $agendaItem->meeting_id !== (string) $meeting->id, 404);

        $agendaItem->delete();

        return response()->json(null, 204);
    }
}
