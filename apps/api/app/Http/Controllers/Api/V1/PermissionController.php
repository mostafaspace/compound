<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission as SpatiePermission;

class PermissionController extends Controller
{
    public function index(): JsonResponse
    {
        $permissions = SpatiePermission::where('guard_name', 'sanctum')
            ->get()
            ->map(fn ($p) => [
                'id'          => $p->id,
                'name'        => $p->name,
                'roles_count' => $p->roles()->count(),
                'is_core'     => in_array($p->name, Permission::values()),
            ]);

        return response()->json(['data' => $permissions]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64', 'regex:/^[a-z_]+$/', 'unique:permissions,name'],
        ]);

        $permission = SpatiePermission::create([
            'name'       => $validated['name'],
            'guard_name' => 'sanctum',
        ]);

        return response()->json(['data' => [
            'id'          => $permission->id,
            'name'        => $permission->name,
            'roles_count' => 0,
            'is_core'     => false,
        ]], 201);
    }

    public function destroy(SpatiePermission $permission): JsonResponse
    {
        if (in_array($permission->name, Permission::values())) {
            return response()->json(['message' => 'Core permissions cannot be deleted.'], 422);
        }

        $permission->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
