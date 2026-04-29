<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserPhotoController extends Controller
{
    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:5120', 'mimes:jpeg,jpg,png,webp'],
        ]);

        // Delete old photo if stored locally
        if ($user->photo_url) {
            $oldPath = str_replace(Storage::disk('public')->url(''), '', $user->photo_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $path = $request->file('photo')->store("users/photos", 'public');
        $user->update(['photo_url' => Storage::disk('public')->url($path)]);

        return response()->json(new UserResource($user->fresh()->loadAuthorizationSnapshot()));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->photo_url) {
            $oldPath = str_replace(Storage::disk('public')->url(''), '', $user->photo_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
            $user->update(['photo_url' => null]);
        }

        return response()->json(new UserResource($user->fresh()->loadAuthorizationSnapshot()));
    }
}
