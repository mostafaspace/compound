<?php

namespace Database\Factories\Apartments;

use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ViolationRule>
 */
class ViolationRuleFactory extends Factory
{
    protected $model = ViolationRule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'name' => 'Noise after hours',
            'name_ar' => null,
            'description' => 'Loud noise after 11pm',
            'default_fee' => 250,
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
