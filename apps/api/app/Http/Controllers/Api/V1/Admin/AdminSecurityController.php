<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminSecurityFlagResource;
use App\Http\Resources\Admin\AdminSessionResource;
use App\Models\Admin\AdminSecurityFlag;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminSecurityController extends Controller
{
    public function indexFlags(): AnonymousResourceCollection
    {
        $this->authorize('view_admin_security');

        $flags = AdminSecurityFlag::query()
            ->with('user')
            ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
            ->latest()
            ->paginate();

        return AdminSecurityFlagResource::collection($flags);
    }

    public function reviewFlag(Request $request, AdminSecurityFlag $flag): AdminSecurityFlagResource
    {
        $this->authorize('manage_admin_security');

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:reviewed,dismissed'],
        ]);

        $flag->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return new AdminSecurityFlagResource($flag);
    }

    public function userSessions(User $user): AnonymousResourceCollection
    {
        $this->authorize('view_admin_security');

        $sessions = $user->adminSessions() // Assuming I added this relation to User
            ->latest('last_seen_at')
            ->paginate();

        return AdminSessionResource::collection($sessions);
    }

    public function suspendAdmin(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage_admin_security');

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot suspend yourself.'], 403);
        }

        $user->update(['status' => AccountStatus::Suspended]);

        return response()->json(['message' => "Admin {$user->name} has been suspended."]);
    }
}
