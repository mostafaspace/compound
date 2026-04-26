# CM-295: RBAC with Spatie + Scope Layer

**Date:** 2026-04-26  
**Ticket:** https://mostafatorra.atlassian.net/browse/CM-295  
**Status:** Approved for implementation

---

## 1. Goal

Replace hard-coded `UserRole` enum checks with a database-driven RBAC system using
**Spatie Laravel Permission** for roles/permissions and a custom **`user_scope_assignments`**
table for hierarchical scoping (compound → building → floor). Every part of the
admin web and mobile app conditionally renders based on the logged-in user's permissions.
Super Admin bypasses all permission checks.

---

## 2. Permissions (18 named, code-defined constants)

Permissions are defined as PHP constants and TypeScript literals — never user-entered
strings. They cannot be renamed without a code change.

```
view_compounds        manage_compounds
view_users            manage_users
view_finance          manage_finance
view_announcements    manage_announcements
view_issues           manage_issues
view_governance       manage_governance
view_security         manage_security
view_visitors         manage_visitors
view_org_chart
view_analytics
view_audit_logs
view_meetings         manage_meetings
view_maintenance      manage_maintenance
manage_settings
manage_roles
```

---

## 3. Roles & Default Permission Sets

| Role | Permissions |
|------|-------------|
| `super_admin` | Bypasses all checks (Gate::before) — no permission rows needed |
| `compound_head` | All 18 except `manage_roles` (only super_admin manages roles) |
| `building_supervisor` | view_users, view/manage_announcements, view/manage_issues, view_security, view_visitors, view_org_chart, view_meetings, view/manage_maintenance |
| `floor_supervisor` | view_users, view_announcements, view/manage_issues, view_visitors, view_org_chart |
| `board_member` | view/manage_governance, view_finance, view/manage_announcements, view_org_chart, view_meetings |
| `finance_reviewer` | view/manage_finance, view_users |
| `security_guard` | view/manage_security, view/manage_visitors |
| `resident_owner` | view_visitors, manage_visitors, view_issues, manage_issues, view_announcements, view_finance, view_org_chart |
| `resident_tenant` | view_visitors, manage_visitors, view_issues, manage_issues, view_announcements |
| `support_agent` | view_users, view_compounds, view_issues, view_announcements, view_finance, view_audit_logs |

---

## 4. Scope System

### 4.1 `user_scope_assignments` Table

```sql
id             bigint PK
user_id        FK → users.id (cascade delete)
role_name      varchar(64)   — matches Spatie role name
scope_type     enum('global','compound','building','floor','unit')
scope_id       bigint nullable  — FK to the scoped resource
created_by     bigint FK → users.id
created_at / updated_at
UNIQUE(user_id, role_name, scope_type, scope_id)
```

### 4.2 Hierarchy Rules

When checking if a user can access resource R:

1. **super_admin** → always yes (Gate::before bypass)
2. Look up all `user_scope_assignments` for the user
3. For each assignment, the user has access if:
   - `scope_type = global` → access to everything
   - `scope_type = compound` AND R belongs to that compound → yes
   - `scope_type = building` AND R belongs to that building (or a floor/unit within it) → yes
   - `scope_type = floor` AND R belongs to that floor (or a unit within it) → yes
   - `scope_type = unit` AND R is that unit → yes

### 4.3 ScopeResolver Service

```php
class ScopeResolver {
    // Returns true if user's scope grants access to the given resource
    public function userCanAccessResource(User $user, string $scopeType, int $scopeId): bool

    // Returns all compound_ids the user can see (used by query scoping)
    public function resolveCompoundIds(User $user): array|null  // null = all

    // Returns all building_ids the user can see within optional compound
    public function resolveBuildingIds(User $user, ?int $compoundId = null): array|null

    // Returns all floor_ids the user can see within optional building
    public function resolveFloorIds(User $user, ?int $buildingId = null): array|null
}
```

---

## 5. API Layer Changes

### 5.1 User Model

```php
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable {
    use HasApiTokens, HasFactory, Notifiable, HasRoles;
    // keep 'role' column for read-only backward compat during migration
}
```

### 5.2 Permission Constants

New file: `app/Enums/Permission.php`

```php
enum Permission: string {
    case ViewCompounds    = 'view_compounds';
    case ManageCompounds  = 'manage_compounds';
    // ... all 18
}
```

### 5.3 Middleware

Keep `EnsureUserHasRole` but refactor internals to check Spatie roles.
Add new `CheckPermission` middleware:

```php
// Usage on routes:
->middleware('permission:view_finance')
->middleware('permission:view_finance,manage_finance')  // any of these
```

### 5.4 `/auth/me` Response

Extend `UserResource` to include:

```json
{
  "id": 1,
  "name": "...",
  "email": "...",
  "roles": ["building_supervisor"],
  "permissions": ["view_users", "view_announcements", "manage_issues"],
  "scopes": [
    { "role": "building_supervisor", "scope_type": "building", "scope_id": 3 }
  ]
}
```

### 5.5 New API Routes (admin only)

```
GET    /v1/permissions                   → list all permissions
GET    /v1/roles                         → list roles with their permissions
POST   /v1/roles                         → create role
PUT    /v1/roles/{role}                  → update role name / permissions
DELETE /v1/roles/{role}                  → delete role (block if users assigned)
GET    /v1/users/{user}/role-assignments → get user's scope assignments
POST   /v1/users/{user}/role-assignments → assign role+scope to user
DELETE /v1/users/{user}/role-assignments/{assignment} → revoke
```

### 5.6 Existing Route Middleware Migration

Replace:
```php
->middleware('role:super_admin,compound_admin')
```
With:
```php
->middleware('permission:view_finance')
```

All 40+ route groups updated. Routes that previously only checked "is admin?" get `manage_*` permissions. Routes that residents use get their relevant `view_*` permissions.

### 5.7 Migration Strategy (Existing Users)

A one-time seeder `MigrateExistingRolesToSpatie`:

```
users.role = 'super_admin'       → Spatie role 'super_admin',  scope_type = 'global'
users.role = 'compound_admin'    → Spatie role 'compound_head', scope_type = 'compound', scope_id = users.compound_id
users.role = 'board_member'      → Spatie role 'board_member',  scope_type = 'compound', scope_id = users.compound_id
users.role = 'finance_reviewer'  → Spatie role 'finance_reviewer', scope_type = 'compound', scope_id = users.compound_id
users.role = 'security_guard'    → Spatie role 'security_guard',   scope_type = 'compound', scope_id = users.compound_id
users.role = 'resident_owner'    → Spatie role 'resident_owner',   scope_type = 'unit',    scope_id = primary unit
users.role = 'resident_tenant'   → Spatie role 'resident_tenant',  scope_type = 'unit',    scope_id = primary unit
users.role = 'support_agent'     → Spatie role 'support_agent',    scope_type = 'global'
```

`users.role` column kept as read-only legacy; NOT used for authorization after migration.

---

## 6. Admin Web Pages

### 6.1 `/settings/permissions` — Permissions Management

- Table: permission name, used by N roles
- "Add permission" button → modal with name input (snake_case enforced)
- Delete button → disabled if any role uses it (tooltip explains)
- Permissions are code-defined by default; this page lets admins add custom ones

### 6.2 `/settings/roles` — Roles Management

- Left panel: list of roles (create/delete)
- Right panel: permission checkboxes for selected role
- Delete blocked if any user has that role (shows count)
- Audit-logged on every change

### 6.3 `/support/users` (existing, enhanced)

- Add "Roles" column to the existing users table
- Per-user: "Manage Roles" button → side panel:
  - Current role assignments with scope badges
  - "Assign role" form: role dropdown + scope type + scope selector (compound/building/floor picker)
  - "Revoke" button per assignment
- Audit-logged on every change

---

## 7. Mobile App Changes

### 7.1 Auth Contract

`packages/contracts/src/platform.ts` — `AuthenticatedUser`:
```ts
permissions: string[];
scopes: Array<{
  role: string;
  scope_type: 'global' | 'compound' | 'building' | 'floor' | 'unit';
  scope_id: string | null;
}>;
```

### 7.2 `authSlice`

Store `permissions: string[]` alongside `user` and `token`.

### 7.3 `usePermission` Hook

```ts
// apps/mobile/src/hooks/usePermission.ts
export function usePermission(permission: string): boolean {
  const user = useSelector(selectCurrentUser);
  if (!user) return false;
  if (user.roles?.includes('super_admin')) return true;
  return user.permissions?.includes(permission) ?? false;
}
```

### 7.4 Conditional UI

Wrap menu items and screens:

```tsx
const canViewFinance = usePermission('view_finance');
// In menu: only render Finance item if canViewFinance
// In screens: show 403-style empty state if !canViewFinance
```

Apply to: Dashboard, Finance, Governance, Security, Announcements, Issues,
Visitors, OrgChart, Analytics tabs.

---

## 8. What Does NOT Change

- Sanctum token authentication flow — untouched
- `users.status` (active/suspended/invited) checks — untouched
- Existing CompoundContextService scoping — kept, extended with ScopeResolver
- Resident invitation flow — untouched
- Payment/webhook routes — untouched
- All existing migrations — no drops, only additive

---

## 9. Implementation Order

1. **API — Foundation**: Install Spatie, migrations, Permission enum, seed roles+permissions, migrate existing users
2. **API — Middleware + Routes**: Refactor EnsureUserHasRole, add CheckPermission, update all route groups
3. **API — Scope table + ScopeResolver**: Migration, service, integrate with CompoundContextService
4. **API — New CRUD endpoints**: roles, permissions, user role assignments
5. **API — /auth/me update**: Return roles, permissions, scopes
6. **Admin web — Permissions page**: `/settings/permissions`
7. **Admin web — Roles page**: `/settings/roles`
8. **Admin web — Users enhancement**: role assignment panel in `/support/users`
9. **Mobile — Contract + slice + hook**: permissions in AuthenticatedUser, usePermission
10. **Mobile — Conditional UI**: apply usePermission across all screens
11. **Commit + Jira → Done**
