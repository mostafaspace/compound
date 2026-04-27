<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class UserRoleAssignmentController extends Controller
{
    public function index(User $user): JsonResponse
    {
        $assignments = $user->scopeAssignments()->with('creator')->get()
            ->map(fn (UserScopeAssignment $a) => [
                'id'         => $a->id,
                'role_name'  => $a->role_name,
                'scope_type' => $a->scope_type,
                'scope_id'   => $a->scope_id,
                'created_by' => $a->creator?->name,
                'created_at' => $a->created_at,
            ]);

        return response()->json([
            'data' => [
                'spatie_roles'      => $user->getRoleNames(),
                'scope_assignments' => $assignments,
            ],
        ]);
    }

    public function store(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_name'  => ['required', 'string', 'exists:roles,name'],
            'scope_type' => ['required', 'in:global,compound,building,floor,unit'],
            'scope_id'   => ['nullable', 'string', 'max:26'],
        ]);

        if ($validated['scope_type'] !== 'global' && empty($validated['scope_id'])) {
            return response()->json(['message' => 'scope_id is required for non-global scope types.'], 422);
        }

        $role = Role::where('name', $validated['role_name'])->where('guard_name', 'sanctum')->first();
        if ($role && ! $user->hasRole($role)) {
            $user->assignRole($role);
        }

        $assignment = UserScopeAssignment::firstOrCreate(
            [
                'user_id'    => $user->id,
                'role_name'  => $validated['role_name'],
                'scope_type' => $validated['scope_type'],
                'scope_id'   => $validated['scope_type'] === 'global' ? '' : ($validated['scope_id'] ?? ''),
            ],
            [
                'created_by' => $request->user()?->id,
            ]
        );

        return response()->json(['data' => [
            'id'         => $assignment->id,
            'role_name'  => $assignment->role_name,
            'scope_type' => $assignment->scope_type,
            'scope_id'   => $assignment->scope_id,
        ]], 201);
    }

    public function destroy(Request $request, User $user, UserScopeAssignment $assignment): JsonResponse
    {
        if ($assignment->user_id !== $user->id) {
            abort(404);
        }

        $roleName = $assignment->role_name;
        $assignment->delete();

        // Revoke Spatie role if user has no more scope assignments for it
        $hasRemaining = UserScopeAssignment::where('user_id', $user->id)
            ->where('role_name', $roleName)
            ->exists();

        if (! $hasRemaining) {
            $user->removeRole($roleName);
        }

        return response()->json(['data' => ['deleted' => true]]);
    }
}
