<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\UpsertNotificationTemplateRequest;
use App\Http\Resources\NotificationTemplateResource;
use App\Models\NotificationTemplate;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationTemplateController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $context,
    ) {}

    /**
     * List templates for the current compound (plus global fallbacks).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->context->resolve($request);

        $templates = NotificationTemplate::query()
            ->when(
                $compoundId !== null,
                fn ($query) => $query->where(function ($inner) use ($compoundId) {
                    $inner->where('compound_id', $compoundId)->orWhereNull('compound_id');
                }),
            )
            ->orderBy('category')
            ->orderBy('channel')
            ->orderBy('locale')
            ->get();

        return NotificationTemplateResource::collection($templates);
    }

    /**
     * Create a new template.
     */
    public function store(UpsertNotificationTemplateRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['compound_id'] = $this->context->resolveManagedCompound(
            $request,
            $validated['compound_id'] ?? null,
            allowGlobalForSuperAdmin: true,
        );

        $template = NotificationTemplate::create($validated);

        return NotificationTemplateResource::make($template)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an existing template.
     */
    public function update(UpsertNotificationTemplateRequest $request, NotificationTemplate $notificationTemplate): NotificationTemplateResource
    {
        $this->ensureTemplateAccess($request, $notificationTemplate);

        $validated = $request->validated();
        $validated['compound_id'] = $this->context->resolveManagedCompound(
            $request,
            $validated['compound_id'] ?? $notificationTemplate->compound_id,
            allowGlobalForSuperAdmin: true,
        );

        $notificationTemplate->update($validated);

        return NotificationTemplateResource::make($notificationTemplate->fresh());
    }

    /**
     * Delete a template.
     */
    public function destroy(NotificationTemplate $notificationTemplate): JsonResponse
    {
        $this->ensureTemplateAccess(request(), $notificationTemplate);
        $notificationTemplate->delete();

        return response()->json(null, 204);
    }

    private function ensureTemplateAccess(Request $request, NotificationTemplate $notificationTemplate): void
    {
        if ($notificationTemplate->compound_id === null) {
            $this->context->ensureGlobalCompoundAccess($request);

            return;
        }

        $this->context->ensureCompoundAccess($request, $notificationTemplate->compound_id);
    }
}
