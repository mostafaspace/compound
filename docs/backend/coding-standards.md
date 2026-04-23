# Backend Coding Standards

Laravel 11 / PHP 8.3. Read this before writing any backend code.

---

## Project Structure

```
apps/api/
  app/
    Enums/            — PHP-backed enums for statuses, roles, categories
    Http/
      Controllers/Api/V1/  — thin controllers (validate, delegate, respond)
      Middleware/           — RoleMiddleware, etc.
      Requests/             — FormRequest classes per action
      Resources/            — JsonResource classes
    Models/           — Eloquent models
    Policies/         — Gate policies (one per model)
    Services/         — Domain logic orchestration
    Jobs/             — Queue jobs
    Events/ + Listeners/
    Notifications/
  database/
    migrations/       — one file per schema change
    seeders/
    factories/        — one Factory per model
  tests/
    Feature/Api/V1/   — HTTP-level feature tests
    Unit/             — unit tests for services/enums
```

---

## Controllers

Controllers must be thin. Delegate all business logic to services.

```php
public function store(CreateIssueRequest $request): JsonResponse
{
    $issue = $this->issueService->create(
        user: $request->user(),
        data: CreateIssueData::fromRequest($request),
    );

    return response()->json(['data' => new IssueResource($issue)], 201);
}
```

Rules:
- No raw `DB::` calls in controllers.
- No `if/else` business logic in controllers — extract to service or policy.
- Always return `JsonResponse` (not arrays or collections directly).
- Use `JsonResource` for every response shape.

---

## Form Requests

Every mutating endpoint gets a `FormRequest`.

```php
class CreateIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // authorization is handled by middleware and policies
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:5000'],
            'category'    => ['required', Rule::enum(IssueCategory::class)],
            'priority'    => ['required', Rule::enum(IssuePriority::class)],
            'unit_id'     => ['required', 'uuid', Rule::exists('units', 'id')],
        ];
    }
}
```

Rules:
- Use `Rule::enum()` for all enum fields.
- Use `Rule::exists()` instead of `'exists:table,column'` string form.
- Add `'nullable'` explicitly — do not rely on implicit nullable.

---

## Models

```php
class Issue extends Model
{
    use HasUuids; // for UUID primary keys only
    use RecordsAuditLog; // if this model needs audit trail

    protected $fillable = ['title', 'description', 'category', ...];

    protected $casts = [
        'category'    => IssueCategory::class,
        'priority'    => IssuePriority::class,
        'status'      => IssueStatus::class,
        'resolved_at' => 'datetime',
        'closed_at'   => 'datetime',
    ];
}
```

Rules:
- Always cast enums using `$casts`. Never compare raw strings to enum values in queries.
- Cast `datetime` columns (not `timestamp`) so they serialize as ISO 8601 strings.
- Do not use `$hidden` to remove fields from JSON — use `JsonResource` instead.
- Do not define `$appends` on models — compute derived fields in `JsonResource`.

---

## Enums

```php
enum IssueStatus: string
{
    case Open       = 'open';
    case InProgress = 'in_progress';
    case Resolved   = 'resolved';
    case Closed     = 'closed';
}
```

Rules:
- All enums are string-backed.
- Place enums in `app/Enums/`.
- Export enum values to `packages/contracts/src/*.ts` as string literal unions.

---

## Services

Services orchestrate domain logic. They receive typed DTOs and return models or void.

```php
class IssueService
{
    public function create(User $user, CreateIssueData $data): Issue
    {
        return DB::transaction(function () use ($user, $data): Issue {
            $issue = Issue::create([
                'title'            => $data->title,
                'reported_by_user_id' => $user->id,
                // ...
            ]);

            AuditLog::record(actor: $user, action: 'issues.created', auditable: $issue);

            return $issue;
        });
    }
}
```

Rules:
- Wrap multi-table writes in `DB::transaction()`.
- Call `AuditLog::record()` (or equivalent) for every state-changing action.
- Services must not call other services (horizontal dependencies cause tangled transactions). Use events/listeners for cross-module communication.

---

## Policies

One policy per model. Register in `AuthServiceProvider` or via discovery.

```php
class IssuePolicy
{
    public function view(User $user, Issue $issue): bool
    {
        if ($user->isAdmin()) return true;
        return $issue->reported_by_user_id === $user->id;
    }

    public function update(User $user, Issue $issue): bool
    {
        return $user->isAdmin();
    }
}
```

Use `$this->authorize('update', $issue)` in controllers.

---

## Migrations

Rules:
- One migration = one logical change (add column, add table, add index).
- Never edit existing migrations on the `main` branch. Always add a new migration.
- Use `Blueprint` methods, not raw SQL.
- Add foreign key constraints with `$table->foreign(...)->on(...)->cascadeOnDelete()` where applicable.
- Add indices on all FK columns and any column used in WHERE clauses with high cardinality.
- Columns that hold monetary amounts: `DECIMAL(15, 2)`.
- Columns for status/enum: `string` with a `CHECK` constraint (via `Rule::in` in migrations) or rely on app-level validation.
- Nullable timestamps: `$table->timestamp('resolved_at')->nullable()`.

---

## Factories

Every model must have a factory used by tests.

```php
class IssueFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title'                  => $this->faker->sentence(),
            'description'            => $this->faker->paragraph(),
            'category'               => $this->faker->randomElement(IssueCategory::cases())->value,
            'priority'               => IssuePriority::Normal->value,
            'status'                 => IssueStatus::Open->value,
            'reported_by_user_id'    => User::factory(),
            'unit_id'                => Unit::factory(),
        ];
    }
}
```

Rules:
- Use `->value` when inserting enum values (factories don't cast).
- Use model factories for related entities (not hardcoded IDs).

---

## Tests

### Structure
- One test class per controller/feature area (e.g. `IssuesTest.php`).
- Use `RefreshDatabase` trait.
- Use `Sanctum::actingAs($user)` for authenticated tests — do not create tokens manually.
- Use `$this->postJson(...)`, `$this->getJson(...)` etc. for HTTP assertions.

### Patterns
```php
public function test_resident_can_create_issue(): void
{
    $unit = Unit::factory()->create();
    $resident = User::factory()->create([
        'role'   => UserRole::ResidentOwner->value,
        'status' => AccountStatus::Active->value,
    ]);

    Sanctum::actingAs($resident);

    $this->postJson('/api/v1/issues', [
        'title'       => 'Water leak',
        'description' => 'Bathroom ceiling is leaking.',
        'category'    => 'maintenance',
        'priority'    => 'normal',
        'unit_id'     => $unit->id,
    ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Water leak');
}
```

### Rules
- Every test method name must read as a sentence: `test_X_can/cannot_Y_when_Z`.
- Test both happy path and unhappy paths (wrong role, wrong status, validation error).
- Use `assertDatabaseHas` / `assertDatabaseMissing` to verify side effects.
- Do not use `assertJson(['data' => [...]])` with nested arrays — use `assertJsonPath('data.field', value)` instead.

---

## Seeding

Seeders are for:
1. **DocumentTypeSeeder** — required document types (run in production).
2. **NextPointSeeder** — demo/development data: one compound, buildings, units, all persona users.

Never delete seeder data in migrations. Keep seeders idempotent using `firstOrCreate`.

---

## Audit Logging

Every HTTP request that changes state must produce an audit log. The `RecordsAuditLog` trait (or `AuditLog::record(...)` helper) handles this.

Required fields: `actor_id`, `action`, `auditable_type`, `auditable_id`, `method`, `path`, `status_code`, `ip_address`.

Action naming convention: `{module}.{event_past_tense}`, e.g.:
- `auth.login_succeeded`
- `documents.reviewed`
- `finance.payment_approved`
- `issues.escalated`

---

## Queue Jobs

- All jobs implement `ShouldQueue`.
- Use `dispatch()->onQueue('default')` or named queues.
- Jobs must be idempotent where possible.
- Failed jobs go to `failed_jobs` table — monitor via Laravel Horizon or `php artisan queue:failed`.

---

## Error Handling

- Validation: `FormRequest` auto-returns 422.
- Authorization: `$this->authorize(...)` returns 403.
- Not found: use `findOrFail()` which returns 404.
- Custom exceptions: extend `HttpException` with appropriate status codes.
- Do not catch and swallow exceptions in services — let the global handler deal with them.
