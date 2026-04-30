<?php

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Documents\UserDocument;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'phone', 'photo_url', 'role', 'compound_id', 'status', 'password', 'legal_hold', 'anonymized_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * @return list<string>
     */
    public static function authorizationRelations(): array
    {
        return ['roles', 'permissions', 'scopeAssignments'];
    }

    /**
     * Tell Spatie which guard this model uses so roles/permissions are matched
     * against the 'sanctum' guard (the app's API authentication driver).
     */
    public function guardName(): string
    {
        return 'sanctum';
    }

    /**
     * Returns the authoritative role name for the user.
     * Prefers Spatie roles, falls back to the legacy role column.
     */
    public function getEffectiveRoleAttribute(): string
    {
        return $this->effectiveRoleNames()[0] ?? ($this->role instanceof UserRole ? $this->role->value : (string) $this->role);
    }

    public function hasEffectiveRole(UserRole|string $role): bool
    {
        $roleName = $role instanceof UserRole ? $role->value : $role;

        return in_array($roleName, $this->effectiveRoleNames(), true);
    }

    /**
     * @param  iterable<UserRole|string>  $roles
     */
    public function hasAnyEffectiveRole(iterable $roles): bool
    {
        foreach ($roles as $role) {
            if ($this->hasEffectiveRole($role)) {
                return true;
            }
        }

        return false;
    }

    public function isEffectiveSuperAdmin(): bool
    {
        return $this->hasEffectiveRole(UserRole::SuperAdmin);
    }

    public function loadAuthorizationSnapshot(): static
    {
        return $this->loadMissing(self::authorizationRelations());
    }

    /**
     * @return list<string>
     */
    public function effectiveRoleNames(): array
    {
        $assignedRoles = $this->relationLoaded('roles')
            ? $this->roles->pluck('name')->all()
            : $this->roles()->pluck('name')->all();

        if ($assignedRoles !== []) {
            return $this->expandEffectiveRoleNames($assignedRoles);
        }

        $legacyRole = $this->role instanceof UserRole ? $this->role->value : $this->role;

        return $legacyRole === null
            ? []
            : $this->expandEffectiveRoleNames([$legacyRole]);
    }

    /**
     * @return list<string>
     */
    public function serializedRoleNames(): array
    {
        $assignedRoles = $this->relationLoaded('roles')
            ? $this->getRoleNames()->values()->all()
            : $this->roles()->pluck('name')->all();

        if ($assignedRoles !== []) {
            return array_values($assignedRoles);
        }

        $legacyRole = $this->role instanceof UserRole ? $this->role->value : $this->role;

        return $legacyRole === null ? [] : [$legacyRole];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'anonymized_at'     => 'datetime',
            'password'          => 'hashed',
            'role'              => UserRole::class,
            'status'            => AccountStatus::class,
            'legal_hold'        => 'boolean',
        ];
    }

    /**
     * The compound this staff user is scoped to (null for super_admin).
     *
     * @return BelongsTo<Compound, $this>
     */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /**
     * @return HasMany<UnitMembership, $this>
     */
    public function unitMemberships(): HasMany
    {
        return $this->hasMany(UnitMembership::class);
    }

    /**
     * @return BelongsToMany<Unit, $this>
     */
    public function units(): BelongsToMany
    {
        return $this->belongsToMany(Unit::class, 'unit_memberships')
            ->withPivot(['relation_type', 'starts_at', 'ends_at', 'is_primary', 'verification_status'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<ResidentInvitation, $this>
     */
    public function residentInvitations(): HasMany
    {
        return $this->hasMany(ResidentInvitation::class);
    }

    /**
     * @return HasMany<UserDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(UserDocument::class);
    }

    /**
     * @return HasMany<VerificationRequest, $this>
     */
    public function verificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class);
    }

    /**
     * @return HasMany<VerificationRequest, $this>
     */
    public function reviewedVerificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class, 'reviewed_by');
    }

    /**
     * @return HasMany<Notification, $this>
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<NotificationPreference, $this>
     */
    public function notificationPreference(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(NotificationPreference::class);
    }

    /**
     * @return HasMany<UserScopeAssignment, $this>
     */
    public function scopeAssignments(): HasMany
    {
        return $this->hasMany(UserScopeAssignment::class);
    }

    /**
     * @return list<string>
     */
    private function effectiveRoleCandidates(string $roleName): array
    {
        return match ($roleName) {
            UserRole::CompoundAdmin->value => [UserRole::CompoundAdmin->value, 'compound_head'],
            default => [$roleName],
        };
    }

    /**
     * @param  list<string>  $roleNames
     * @return list<string>
     */
    private function expandEffectiveRoleNames(array $roleNames): array
    {
        if (in_array('compound_head', $roleNames, strict: true)) {
            $roleNames[] = UserRole::CompoundAdmin->value;
        }

        return array_values(array_unique($roleNames));
    }
}
