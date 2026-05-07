<?php

namespace Tests\Feature\Database;

use App\Models\Property\Compound;
use App\Models\Property\Unit;
use Database\Seeders\NextPointSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NextPointSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_next_point_seed_data_matches_real_testing_scenario(): void
    {
        $otherCompound = Compound::factory()->create([
            'name' => 'Keep Me Compound',
            'code' => 'KEEP-ME',
        ]);

        $this->seed(NextPointSeeder::class);

        $this->assertDatabaseHas('compounds', [
            'id' => $otherCompound->id,
            'code' => 'KEEP-ME',
        ]);

        $nextPoint = Compound::query()->where('code', 'NEXT-POINT')->firstOrFail();

        $this->assertSame('Next Point', $nextPoint->name);
        $this->assertSame('Mokattam - Cairo', $nextPoint->metadata['location']);
        $this->assertSame('https://nexthome-egy.com/media/1986/logo-02.png', $nextPoint->metadata['logo_url']);
        $this->assertSame(3000, $nextPoint->metadata['residential_units']);
        $this->assertSame(11000, $nextPoint->metadata['resident_capacity']);

        $this->assertSame(
            ['A', 'B', 'C', 'D', 'C/D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
            $nextPoint->buildings()->orderBy('sort_order')->pluck('code')->all(),
        );
        $this->assertDatabaseHas('units', [
            'compound_id' => $nextPoint->id,
            'unit_number' => 'CDR-F2-F2',
        ]);
        $this->assertSame(
            'https://nexthome-egy.com/media/1706/h04-1.jpg',
            $nextPoint->buildings()->where('code', 'H')->firstOrFail()->metadata['image_url'],
        );

        $unit = Unit::query()
            ->where('compound_id', $nextPoint->id)
            ->where('unit_number', 'HR-F2-F2')
            ->firstOrFail();

        $this->assertSame('apartment', $unit->type->value);
        $this->assertSame('130.00', (string) $unit->area_sqm);
        $this->assertSame(2, $unit->floor?->level_number);
        $this->assertSame('H', $unit->building?->code);
    }
}
