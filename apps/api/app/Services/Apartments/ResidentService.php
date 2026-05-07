<?php

namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;

class ResidentService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Unit $unit, User $actor, array $data): ApartmentResident
    {
        $photoPath = $this->uploadPhotoIfPresent($data);

        return ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $data['user_id'] ?? null,
            'relation_type' => $data['relation_type'],
            'is_primary' => $data['is_primary'] ?? false,
            'verification_status' => $data['verification_status'] ?? 'pending',
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'resident_name' => $data['resident_name'] ?? null,
            'resident_phone' => $data['resident_phone'] ?? null,
            'phone_public' => $data['phone_public'] ?? false,
            'resident_email' => $data['resident_email'] ?? null,
            'email_public' => $data['email_public'] ?? false,
            'photo_path' => $photoPath,
            'created_by' => $actor->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ApartmentResident $resident, User $actor, array $data): ApartmentResident
    {
        if (isset($data['photo']) && $data['photo'] instanceof UploadedFile) {
            $data['photo_path'] = $this->uploadPhotoIfPresent($data);
        }

        unset($data['photo']);

        $resident->update($data);

        return $resident->refresh();
    }

    public function delete(ApartmentResident $resident): void
    {
        $resident->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function uploadPhotoIfPresent(array $data): ?string
    {
        $photo = $data['photo'] ?? null;

        if (! $photo instanceof UploadedFile) {
            return null;
        }

        return $photo->store('apartments/residents', 'public');
    }
}
