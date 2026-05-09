<?php

namespace App\Services\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Apartments\VehicleNotification;
use App\Models\Apartments\VehicleNotificationRecipient;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class VehicleNotificationSearchResult
{
    public function __construct(
        public bool $found,
        public int $recipientCount,
        public ?string $anonymizedUnitLabel,
    ) {}
}

class VehicleNotificationService
{
    public function __construct(private readonly PlateNormalizer $normalizer) {}

    public function search(string $plate, User $sender): VehicleNotificationSearchResult
    {
        $vehicle = $this->resolveVehicle($plate, $sender);
        if ($vehicle === null) {
            return new VehicleNotificationSearchResult(false, 0, null);
        }

        $recipientCount = $this->verifiedResidentsQuery($vehicle->unit_id)->count();
        $unit = $vehicle->unit()->with('building')->first();
        $label = $unit && $unit->building
            ? "An apartment in {$unit->building->name}"
            : 'An apartment in this compound';

        return new VehicleNotificationSearchResult(true, $recipientCount, $label);
    }

    public function send(
        string $plate,
        string $message,
        VehicleNotificationSenderMode $mode,
        ?string $alias,
        User $sender,
    ): VehicleNotification {
        $vehicle = $this->resolveVehicle($plate, $sender);
        abort_if($vehicle === null, 404, 'Vehicle not found');

        $senderUnitId = ApartmentResident::query()
            ->active()
            ->where('user_id', $sender->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->value('unit_id');

        return DB::transaction(function () use ($vehicle, $message, $mode, $alias, $sender, $plate, $senderUnitId) {
            $notification = VehicleNotification::query()->create([
                'sender_user_id' => $sender->id,
                'sender_unit_id' => $senderUnitId,
                'sender_mode' => $mode,
                'sender_alias' => $mode === VehicleNotificationSenderMode::Anonymous ? $alias : null,
                'target_vehicle_id' => $vehicle->id,
                'target_unit_id' => $vehicle->unit_id,
                'target_plate_query' => $plate,
                'message' => $message,
            ]);

            $recipientUserIds = $this->verifiedResidentsQuery($vehicle->unit_id)
                ->whereNotNull('user_id')
                ->where('user_id', '!=', $sender->id)
                ->pluck('user_id')
                ->unique();

            foreach ($recipientUserIds as $userId) {
                VehicleNotificationRecipient::query()->create([
                    'vehicle_notification_id' => $notification->id,
                    'user_id' => $userId,
                ]);
            }

            return $notification;
        });
    }

    /**
     * @return LengthAwarePaginator<int, VehicleNotificationRecipient>
     */
    public function listForUser(User $user, int $perPage = 25): LengthAwarePaginator
    {
        return VehicleNotificationRecipient::query()
            ->where('user_id', $user->id)
            ->with('notification.targetVehicle:id,plate')
            ->latest('created_at')
            ->paginate($perPage);
    }

    public function markRead(VehicleNotificationRecipient $recipient, User $user): void
    {
        abort_if($recipient->user_id !== $user->id, 404);
        $recipient->update(['read_at' => now()]);
    }

    private function resolveVehicle(string $plate, User $sender): ?ApartmentVehicle
    {
        $compoundId = ApartmentResident::query()
            ->active()
            ->where('user_id', $sender->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->join('units', 'units.id', '=', 'apartment_residents.unit_id')
            ->value('units.compound_id');

        if ($compoundId === null) {
            return null;
        }

        $terms = $this->normalizer->searchTerms($plate);

        return ApartmentVehicle::query()
            ->whereHas('unit', fn ($q) => $q->where('compound_id', $compoundId))
            ->where(function ($q) use ($plate, $terms) {
                $q->where('plate', 'like', "%{$plate}%")
                    ->orWhere('plate_normalized', $terms['normalized']);
                if ($terms['lettersAr'] !== '') {
                    $q->orWhere('plate_letters_ar', 'like', "%{$terms['lettersAr']}%");
                }
                if ($terms['digitsNormalized'] !== '') {
                    $q->orWhere('plate_digits_normalized', $terms['digitsNormalized']);
                }
            })
            ->with('unit.building')
            ->first();
    }

    /**
     * @return Builder<ApartmentResident>
     */
    private function verifiedResidentsQuery(string $unitId)
    {
        return ApartmentResident::query()
            ->active()
            ->where('unit_id', $unitId)
            ->where('verification_status', VerificationStatus::Verified->value);
    }
}
