<?php

namespace Database\Factories\Governance;

use App\Enums\VoteEligibility;
use App\Enums\VoteScope;
use App\Enums\VoteStatus;
use App\Enums\VoteType;
use App\Models\Governance\Vote;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vote>
 */
class VoteFactory extends Factory
{
    protected $model = Vote::class;

    public function definition(): array
    {
        return [
            'compound_id'             => Compound::factory(),
            'building_id'             => null,
            'type'                    => fake()->randomElement(VoteType::cases())->value,
            'title'                   => fake()->sentence(5),
            'description'             => fake()->paragraph(),
            'status'                  => VoteStatus::Draft->value,
            'scope'                   => VoteScope::Compound->value,
            'eligibility'             => VoteEligibility::OwnersOnly->value,
            'requires_doc_compliance' => false,
            'is_anonymous'            => false,
            'starts_at'               => null,
            'ends_at'                 => null,
            'created_by'              => User::factory(),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'    => VoteStatus::Active->value,
            'starts_at' => now()->subHour(),
            'ends_at'   => now()->addDay(),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'  => VoteStatus::Closed->value,
            'ends_at' => now()->subHour(),
        ]);
    }

    public function poll(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => VoteType::Poll->value,
        ]);
    }

    public function election(): static
    {
        return $this->state(fn (array $attributes) => [
            'type'        => VoteType::Election->value,
            'eligibility' => VoteEligibility::OwnersOnly->value,
        ]);
    }

    public function allVerified(): static
    {
        return $this->state(fn (array $attributes) => [
            'eligibility' => VoteEligibility::AllVerified->value,
        ]);
    }
}
