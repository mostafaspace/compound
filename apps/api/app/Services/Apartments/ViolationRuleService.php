<?php

namespace App\Services\Apartments;

use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;

class ViolationRuleService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Compound $compound, User $actor, array $data): ViolationRule
    {
        return ViolationRule::query()->create([
            'compound_id' => $compound->id,
            'name' => $data['name'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'default_fee' => $data['default_fee'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $actor->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ViolationRule $rule, array $data): ViolationRule
    {
        $rule->update($data);

        return $rule->refresh();
    }

    public function archive(ViolationRule $rule): void
    {
        $rule->delete();
    }
}
