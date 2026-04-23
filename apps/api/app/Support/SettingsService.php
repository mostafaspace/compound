<?php

namespace App\Support;

use App\Models\CompoundSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class SettingsService
{
    /**
     * Default setting values, keyed by "namespace.key".
     * These are returned when no DB row exists for the given compound+namespace+key.
     *
     * @var array<string, mixed>
     */
    protected static array $defaults = [
        // Documents
        'documents.require_upload_for_onboarding' => true,
        'documents.allowed_extensions'            => ['pdf', 'jpg', 'jpeg', 'png'],
        'documents.max_file_size_mb'              => 10,

        // Verification
        'verification.auto_approve_residents'     => false,
        'verification.checklist_items'            => ['national_id', 'lease_or_title_deed'],

        // Visitors
        'visitors.max_visitors_per_unit_per_day'  => 10,
        'visitors.require_pre_approval'           => false,
        'visitors.pass_validity_hours'            => 24,
        'visitors.gate_notification_enabled'      => true,

        // Issues
        'issues.default_categories'               => ['maintenance', 'noise', 'security', 'cleanliness', 'other'],
        'issues.auto_escalate_after_hours'        => 72,
        'issues.notify_board_on_escalation'       => true,

        // Announcements
        'announcements.default_categories'        => ['general', 'maintenance', 'finance', 'events', 'urgent'],
        'announcements.require_approval'          => false,

        // Finance
        'finance.accepted_payment_methods'        => ['bank_transfer', 'cash', 'check'],
        'finance.late_fee_enabled'                => false,
        'finance.late_fee_percentage'             => 2.0,
        'finance.grace_period_days'               => 7,
        'finance.currency'                        => 'EGP',

        // Voting / Governance
        'governance.default_eligibility'          => 'owners_only',
        'governance.require_doc_compliance'       => false,
        'governance.min_vote_duration_hours'      => 24,

        // Notifications
        'notifications.email_enabled'             => true,
        'notifications.sms_enabled'               => false,
        'notifications.push_enabled'              => true,
        'notifications.digest_frequency'          => 'realtime',
    ];

    /**
     * Get all settings for a namespace, merging defaults with compound-level overrides.
     *
     * @return array<string, mixed>
     */
    public function getNamespace(string $namespace, ?string $compoundId = null): array
    {
        // Collect default keys for this namespace
        $defaults = [];
        foreach (static::$defaults as $dotKey => $value) {
            [$ns, $key] = explode('.', $dotKey, 2);
            if ($ns === $namespace) {
                $defaults[$key] = $value;
            }
        }

        // Load DB rows for this namespace (global rows + compound overrides)
        $query = CompoundSetting::query()
            ->where('namespace', $namespace)
            ->where(function ($q) use ($compoundId): void {
                $q->whereNull('compound_id');
                if ($compoundId) {
                    $q->orWhere('compound_id', $compoundId);
                }
            });

        $rows = $query->get();

        // Start from defaults
        $merged = $defaults;

        // Apply global overrides first
        foreach ($rows->whereNull('compound_id') as $row) {
            $merged[$row->key] = $row->value;
        }

        // Apply compound-specific overrides on top
        if ($compoundId) {
            foreach ($rows->where('compound_id', $compoundId) as $row) {
                $merged[$row->key] = $row->value;
            }
        }

        return $merged;
    }

    /**
     * Get a single setting value, falling back to the default.
     */
    public function get(string $namespace, string $key, ?string $compoundId = null, mixed $fallback = null): mixed
    {
        $setting = CompoundSetting::query()
            ->where('namespace', $namespace)
            ->where('key', $key)
            ->where(function ($q) use ($compoundId): void {
                if ($compoundId) {
                    $q->where('compound_id', $compoundId);
                } else {
                    $q->whereNull('compound_id');
                }
            })
            ->first();

        if ($setting) {
            return $setting->value;
        }

        $dotKey = "{$namespace}.{$key}";

        return Arr::get(static::$defaults, $dotKey, $fallback);
    }

    /**
     * Set a setting value, writing an audit log with before/after values.
     *
     * @param  array<string, mixed>  $metadata  Extra audit metadata (e.g. reason)
     */
    public function set(
        string $namespace,
        string $key,
        mixed $value,
        ?string $compoundId = null,
        ?User $actor = null,
        ?Request $request = null,
        array $metadata = [],
    ): CompoundSetting {
        $before = $this->get($namespace, $key, $compoundId);

        $setting = CompoundSetting::query()->updateOrCreate(
            [
                'compound_id' => $compoundId,
                'namespace'   => $namespace,
                'key'         => $key,
            ],
            ['value' => $value],
        );

        app(AuditLogger::class)->record(
            action: 'settings.updated',
            actor: $actor,
            request: $request,
            statusCode: 200,
            auditableType: CompoundSetting::class,
            auditableId: (string) $setting->id,
            metadata: array_merge($metadata, [
                'namespace'   => $namespace,
                'key'         => $key,
                'compound_id' => $compoundId,
                'before'      => $before,
                'after'       => $value,
            ]),
        );

        return $setting;
    }

    /**
     * Bulk-set multiple keys within a namespace.
     *
     * @param  array<string, mixed>  $values  key => value pairs
     * @param  array<string, mixed>  $metadata
     * @return CompoundSetting[]
     */
    public function setMany(
        string $namespace,
        array $values,
        ?string $compoundId = null,
        ?User $actor = null,
        ?Request $request = null,
        array $metadata = [],
    ): array {
        $results = [];
        foreach ($values as $key => $value) {
            $results[$key] = $this->set($namespace, $key, $value, $compoundId, $actor, $request, $metadata);
        }

        return $results;
    }

    /**
     * Return all known namespaces.
     *
     * @return string[]
     */
    public static function namespaces(): array
    {
        return array_unique(array_map(
            fn ($k) => explode('.', $k, 2)[0],
            array_keys(static::$defaults),
        ));
    }

    /**
     * Return the defaults map (for testing / introspection).
     *
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return static::$defaults;
    }
}
