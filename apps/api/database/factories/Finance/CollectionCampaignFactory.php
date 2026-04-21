<?php

namespace Database\Factories\Finance;

use App\Enums\CampaignStatus;
use App\Models\Finance\CollectionCampaign;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CollectionCampaign>
 */
class CollectionCampaignFactory extends Factory
{
    protected $model = CollectionCampaign::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'name' => $this->faker->sentence(nbWords: 4),
            'description' => $this->faker->optional()->paragraph(),
            'status' => CampaignStatus::Draft->value,
            'target_amount' => $this->faker->optional()->randomFloat(2, 1000, 100000),
            'started_at' => null,
            'closed_at' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CampaignStatus::Active->value,
            'started_at' => now(),
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CampaignStatus::Archived->value,
        ]);
    }
}
