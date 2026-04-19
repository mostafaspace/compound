<?php

namespace App\Notifications;

use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResidentInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $acceptUrl,
        private readonly string $compoundName,
        private readonly ?string $unitNumber,
        private readonly ?CarbonInterface $expiresAt,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $unitLine = $this->unitNumber
            ? "This invite is linked to unit {$this->unitNumber}."
            : 'This invite is not linked to a unit yet.';

        return (new MailMessage)
            ->subject("You're invited to {$this->compoundName}")
            ->greeting('Complete your compound account')
            ->line("An administrator invited you to join {$this->compoundName}.")
            ->line($unitLine)
            ->line($this->expiresAt ? 'This link expires on '.$this->expiresAt->toDayDateTimeString().'.' : 'This link has an expiry configured by the administrator.')
            ->action('Complete account', $this->acceptUrl)
            ->line('If you were not expecting this invite, ignore this email and contact the compound administration team.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'acceptUrl' => $this->acceptUrl,
            'compoundName' => $this->compoundName,
            'unitNumber' => $this->unitNumber,
            'expiresAt' => $this->expiresAt?->toJSON(),
        ];
    }
}
