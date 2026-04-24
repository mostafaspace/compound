<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\RegisterDeviceTokenRequest;
use App\Http\Resources\DeviceTokenResource;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;

class DeviceTokenController extends Controller
{
    /**
     * List the authenticated user's registered device tokens.
     */
    public function index(): AnonymousResourceCollection
    {
        $tokens = DeviceToken::where('user_id', Auth::id())
            ->orderByDesc('last_seen_at')
            ->get();

        return DeviceTokenResource::collection($tokens);
    }

    /**
     * Register (or refresh) a device token for the authenticated user.
     * Upserts on (user_id, token) to handle re-registration gracefully.
     */
    public function store(RegisterDeviceTokenRequest $request): JsonResponse
    {
        $token = DeviceToken::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'token'   => $request->input('token'),
            ],
            [
                'platform'     => $request->input('platform'),
                'device_name'  => $request->input('device_name'),
                'last_seen_at' => now(),
            ],
        );

        return DeviceTokenResource::make($token)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Unregister a device token (e.g. on logout).
     */
    public function destroy(DeviceToken $deviceToken): JsonResponse
    {
        abort_if($deviceToken->user_id !== Auth::id(), 403);

        $deviceToken->delete();

        return response()->json(null, 204);
    }
}
