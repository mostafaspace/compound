<?php

namespace Tests\Feature\Services\Apartments;

use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\NoteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NoteServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_append_creates_note(): void
    {
        $unit = Unit::factory()->create();
        $author = User::factory()->create();

        $note = app(NoteService::class)->append($unit, $author, 'paid gas');

        $this->assertSame('paid gas', $note->body);
        $this->assertSame($author->id, $note->author_id);
    }

    public function test_listing_orders_desc(): void
    {
        $unit = Unit::factory()->create();
        ApartmentNote::factory()->count(3)->create(['unit_id' => $unit->id]);

        $page = app(NoteService::class)->paginate($unit);

        $this->assertCount(3, $page->items());
    }
}
