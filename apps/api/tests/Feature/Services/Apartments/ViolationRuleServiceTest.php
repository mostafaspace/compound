<?php

namespace Tests\Feature\Services\Apartments;

use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;
use App\Services\Apartments\ViolationRuleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViolationRuleServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_rule(): void
    {
        $compound = Compound::factory()->create();

        $rule = app(ViolationRuleService::class)->create($compound, User::factory()->create(), [
            'name' => 'Speeding',
            'default_fee' => 500,
        ]);

        $this->assertSame('Speeding', $rule->name);
        $this->assertSame($compound->id, $rule->compound_id);
    }

    public function test_updates_rule(): void
    {
        $rule = ViolationRule::factory()->create(['default_fee' => 100]);

        $updated = app(ViolationRuleService::class)->update($rule, ['default_fee' => 200]);

        $this->assertSame('200.00', (string) $updated->default_fee);
    }

    public function test_archives_rule(): void
    {
        $rule = ViolationRule::factory()->create();

        app(ViolationRuleService::class)->archive($rule);

        $this->assertSoftDeleted($rule);
    }
}
