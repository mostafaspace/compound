<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AnnouncementTargetType;
use App\Http\Controllers\Controller;
use App\Services\AnnouncementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementTargetPreviewController extends Controller
{
    public function __construct(private readonly AnnouncementService $service) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('view_announcements'); // Or a specific permission if needed

        $validated = $request->validate([
            'targetType' => ['required', Rule::enum(AnnouncementTargetType::class)],
            'targetIds' => ['nullable', 'array'],
            'targetRole' => ['nullable', 'string'],
            'requiresVerifiedMembership' => ['nullable', 'boolean'],
        ]);

        $count = $this->service->previewRecipientsCount(
            AnnouncementTargetType::from($validated['targetType']),
            $validated['targetIds'] ?? null,
            $validated['targetRole'] ?? null,
            (bool) ($validated['requiresVerifiedMembership'] ?? false)
        );

        return response()->json([
            'data' => [
                'recipientCount' => $count,
            ],
        ]);
    }
}
