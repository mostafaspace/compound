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
        $unitLineAr = $this->unitNumber
            ? "هذه الدعوة مرتبطة بالوحدة {$this->unitNumber}."
            : 'هذه الدعوة غير مرتبطة بوحدة حتى الآن.';
        $expiryLine = $this->expiresAt
            ? 'This link expires on '.$this->expiresAt->toDayDateTimeString().'.'
            : 'This link has an expiry configured by the administrator.';
        $expiryLineAr = $this->expiresAt
            ? 'ينتهي هذا الرابط في '.$this->expiresAt->toDayDateTimeString().'.'
            : 'لهذا الرابط تاريخ انتهاء يحدده مسؤول المجمع.';

        return (new MailMessage)
            ->subject("You're invited to {$this->compoundName} / دعوة إلى {$this->compoundName}")
            ->greeting('Complete your compound account / أكمل حسابك في المجمع')
            ->line("An administrator invited you to join {$this->compoundName}.")
            ->line("دعاك أحد مسؤولي المجمع للانضمام إلى {$this->compoundName}.")
            ->line($unitLine)
            ->line($unitLineAr)
            ->line($expiryLine)
            ->line($expiryLineAr)
            ->action('Complete account / إكمال الحساب', $this->acceptUrl)
            ->line('If you were not expecting this invite, ignore this email and contact the compound administration team.')
            ->line('إذا لم تكن تتوقع هذه الدعوة، فتجاهل هذه الرسالة وتواصل مع إدارة المجمع.');
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
            'titleEn' => "You're invited to {$this->compoundName}",
            'titleAr' => "دعوة إلى {$this->compoundName}",
        ];
    }
}
