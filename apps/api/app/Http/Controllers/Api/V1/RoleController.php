<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::where('guard_name', 'sanctum')
            ->with('permissions')
            ->get()
            ->map(fn (Role $role) => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions->pluck('name'),
                'users_count' => $role->users()->count(),
            ]);

        return response()->json(['data' => $roles]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:64', 'regex:/^[a-z_]+$/', 'unique:roles,name'],
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create(['name' => $validated['name'], 'guard_name' => 'sanctum']);
        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json(['data' => [
            'id'          => $role->id,
            'name'        => $role->name,
            'permissions' => $role->permissions->pluck('name'),
            'users_count' => 0,
        ]], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions'   => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->syncPermissions($validated['permissions']);

        return response()->json(['data' => [
            'id'          => $role->id,
            'name'        => $role->name,
            'permissions' => $role->fresh('permissions')->permissions->pluck('name'),
            'users_count' => $role->users()->count(),
        ]]);
    }

    public function destroy(Role $role): JsonResponse
    {
        $usersCount = $role->users()->count();
        if ($usersCount > 0) {
            return response()->json([
                'message' => "Cannot delete role '{$role->name}': {$usersCount} user(s) are assigned to it.",
            ], 422);
        }

        $role->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
