<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'photoUrl' => $this->photo_url,
            'compoundId' => $this->compound_id,
            'role' => $this->role->value,
            'status' => $this->status->value,
            'emailVerifiedAt' => $this->email_verified_at?->toJSON(),
            'lastLoginAt'     => $this->last_login_at?->toJSON(),
            'legal_hold'      => $this->legal_hold ?? false,
            'anonymized_at'   => $this->anonymized_at?->toJSON(),
            'roles'       => $this->serializedRoleNames(),
            'permissions' => $this->whenLoaded('permissions', fn () => $this->getAllPermissions()->pluck('name')->values()->all(), []),
            'scopes'      => $this->whenLoaded('scopeAssignments', fn () => $this->scopeAssignments->map(fn ($a) => [
                'role'       => $a->role_name,
                'scope_type' => $a->scope_type,
                'scope_id'   => $a->scope_id !== '' ? $a->scope_id : null,
            ])->values()->all(), []),
        ];
    }
}
