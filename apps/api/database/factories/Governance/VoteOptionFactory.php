<?php

namespace Database\Factories\Governance;

use App\Models\Governance\Vote;
use App\Models\Governance\VoteOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VoteOption>
 */
class VoteOptionFactory extends Factory
{
    protected $model = VoteOption::class;

    public function definition(): array
    {
        return [
            'vote_id'    => Vote::factory(),
            'label'      => fake()->words(3, true),
            'sort_order' => 0,
        ];
    }
}
