<?php

namespace Tests\Feature\Database;

use App\Models\Apartments\ApartmentNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentNoteModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory(): void
    {
        $note = ApartmentNote::factory()->create();

        $this->assertNotNull($note->unit_id);
        $this->assertInstanceOf(User::class, $note->author);
        $this->assertNotEmpty($note->body);
    }
}
