<?php

namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class NoteService
{
    public function append(Unit $unit, User $author, string $body): ApartmentNote
    {
        return ApartmentNote::query()->create([
            'unit_id' => $unit->id,
            'author_id' => $author->id,
            'body' => $body,
        ]);
    }

    public function update(ApartmentNote $note, string $body): ApartmentNote
    {
        $note->update(['body' => $body]);

        return $note->refresh();
    }

    public function delete(ApartmentNote $note): void
    {
        $note->delete();
    }

    public function paginate(Unit $unit, int $perPage = 20): LengthAwarePaginator
    {
        return ApartmentNote::query()
            ->where('unit_id', $unit->id)
            ->orderByDesc('created_at')
            ->with('author:id,name')
            ->paginate($perPage);
    }
}
