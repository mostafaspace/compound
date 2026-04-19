<?php

namespace App\Notifications;

use App\Enums\VerificationRequestStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerificationDecisionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly VerificationRequestStatus $status,
        private readonly string $compoundName,
        private readonly ?string $unitNumber,
        private readonly ?string $note,
        private readonly ?string $actionUrl = null,
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
        $message = (new MailMessage)
            ->subject($this->subject())
            ->greeting($this->greeting())
            ->line($this->introLine())
            ->line($this->unitLine());

        if ($this->note) {
            $message->line('Reviewer note: '.$this->note);
        }

        if ($this->actionUrl) {
            $message->action($this->actionLabel(), $this->actionUrl);
        }

        return $message->line('Contact the compound administration team if you have questions about this decision.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'status' => $this->status->value,
            'compoundName' => $this->compoundName,
            'unitNumber' => $this->unitNumber,
            'note' => $this->note,
            'actionUrl' => $this->actionUrl,
        ];
    }

    private function subject(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::Approved => 'Your compound account has been approved',
            VerificationRequestStatus::Rejected => 'Your compound verification was rejected',
            VerificationRequestStatus::MoreInfoRequested => 'More information is needed for your compound account',
            VerificationRequestStatus::PendingReview => 'Your compound account is under review',
        };
    }

    private function greeting(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::Approved => 'Your account is approved',
            VerificationRequestStatus::Rejected => 'Verification was rejected',
            VerificationRequestStatus::MoreInfoRequested => 'More information is needed',
            VerificationRequestStatus::PendingReview => 'Your account is under review',
        };
    }

    private function introLine(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::Approved => "Your access to {$this->compoundName} has been approved. You can now use your resident account.",
            VerificationRequestStatus::Rejected => "Your access request for {$this->compoundName} was rejected during verification.",
            VerificationRequestStatus::MoreInfoRequested => "The administration team needs more information before approving your access to {$this->compoundName}.",
            VerificationRequestStatus::PendingReview => "Your access request for {$this->compoundName} is still under review.",
        };
    }

    private function unitLine(): string
    {
        return $this->unitNumber
            ? "This decision is linked to unit {$this->unitNumber}."
            : 'This decision is not linked to a specific unit.';
    }

    private function actionLabel(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::MoreInfoRequested => 'Provide information',
            VerificationRequestStatus::Approved => 'Open resident app',
            VerificationRequestStatus::Rejected, VerificationRequestStatus::PendingReview => 'Review account',
        };
    }
}
