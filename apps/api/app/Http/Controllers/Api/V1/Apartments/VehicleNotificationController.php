<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\SearchVehicleNotificationRequest;
use App\Http\Requests\Apartments\SendVehicleNotificationRequest;
use App\Http\Resources\Apartments\VehicleNotificationResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\VehicleNotificationRecipient;
use App\Services\Apartments\VehicleNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleNotificationController extends Controller
{
    public function __construct(private readonly VehicleNotificationService $service) {}

    public function search(SearchVehicleNotificationRequest $request): JsonResponse
    {
        $this->ensureVerifiedResident($request);
        $r = $this->service->search($request->validated('plate'), $request->user());

        return response()->json([
            'data' => [
                'found' => $r->found,
                'recipientCount' => $r->recipientCount,
                'anonymizedUnitLabel' => $r->anonymizedUnitLabel,
            ],
        ]);
    }

    public function send(SendVehicleNotificationRequest $request): JsonResponse
    {
        $this->ensureVerifiedResident($request);
        $n = $this->service->send(
            $request->validated('plate'),
            $request->validated('message'),
            VehicleNotificationSenderMode::from($request->validated('sender_mode')),
            $request->validated('sender_alias'),
            $request->user(),
        );

        return response()->json([
            'data' => [
                'id' => $n->id,
                'recipientCount' => $n->recipients()->count(),
            ],
        ], 201);
    }

    public function index(Request $request)
    {
        return VehicleNotificationResource::collection(
            $this->service->listForUser($request->user())
        );
    }

    public function markRead(Request $request, VehicleNotificationRecipient $recipient): JsonResponse
    {
        $this->service->markRead($recipient, $request->user());

        return response()->json(null, 204);
    }

    private function ensureVerifiedResident(Request $request): void
    {
        $exists = ApartmentResident::query()
            ->active()
            ->where('user_id', $request->user()->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->exists();
        abort_unless($exists, 403, 'Verified resident required');
    }
}
