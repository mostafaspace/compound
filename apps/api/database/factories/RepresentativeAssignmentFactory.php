<?php

namespace Database\Factories;

use App\Enums\ContactVisibility;
use App\Enums\RepresentativeRole;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RepresentativeAssignment>
 */
class RepresentativeAssignmentFactory extends Factory
{
    protected $model = RepresentativeAssignment::class;

    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'building_id' => null,
            'floor_id' => null,
            'user_id' => User::factory(),
            'role' => RepresentativeRole::President->value,
            'starts_at' => now()->toDateString(),
            'ends_at' => null,
            'is_active' => true,
            'contact_visibility' => ContactVisibility::AllResidents->value,
            'appointed_by' => null,
            'notes' => null,
        ];
    }

    public function forBuilding(Building $building): static
    {
        return $this->state([
            'compound_id' => $building->compound_id,
            'building_id' => $building->id,
            'role' => RepresentativeRole::BuildingRepresentative->value,
        ]);
    }

    public function forFloor(Floor $floor): static
    {
        return $this->state([
            'compound_id' => $floor->building->compound_id ?? Compound::factory(),
            'building_id' => $floor->building_id,
            'floor_id' => $floor->id,
            'role' => RepresentativeRole::FloorRepresentative->value,
        ]);
    }

    public function expired(): static
    {
        return $this->state([
            'is_active' => false,
            'ends_at' => now()->subDay()->toDateString(),
        ]);
    }
}
