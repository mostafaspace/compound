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
            ->subject($this->subject().' / '.$this->subjectAr())
            ->greeting($this->greeting().' / '.$this->greetingAr())
            ->line($this->introLine())
            ->line($this->introLineAr())
            ->line($this->unitLine())
            ->line($this->unitLineAr());

        if ($this->note) {
            $message->line('Reviewer note: '.$this->note);
            $message->line('ملاحظة المراجع: '.$this->note);
        }

        if ($this->actionUrl) {
            $message->action($this->actionLabel().' / '.$this->actionLabelAr(), $this->actionUrl);
        }

        return $message
            ->line('Contact the compound administration team if you have questions about this decision.')
            ->line('تواصل مع إدارة المجمع إذا كانت لديك أسئلة عن هذا القرار.');
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
            'titleEn' => $this->subject(),
            'titleAr' => $this->subjectAr(),
            'bodyEn' => $this->introLine(),
            'bodyAr' => $this->introLineAr(),
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

    private function subjectAr(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::Approved => 'تمت الموافقة على حسابك في المجمع',
            VerificationRequestStatus::Rejected => 'تم رفض طلب التحقق الخاص بك',
            VerificationRequestStatus::MoreInfoRequested => 'مطلوب معلومات إضافية لحسابك في المجمع',
            VerificationRequestStatus::PendingReview => 'حسابك في المجمع قيد المراجعة',
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

    private function greetingAr(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::Approved => 'تمت الموافقة على حسابك',
            VerificationRequestStatus::Rejected => 'تم رفض التحقق',
            VerificationRequestStatus::MoreInfoRequested => 'مطلوب معلومات إضافية',
            VerificationRequestStatus::PendingReview => 'حسابك قيد المراجعة',
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

    private function introLineAr(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::Approved => "تمت الموافقة على وصولك إلى {$this->compoundName}. يمكنك الآن استخدام حساب الساكن.",
            VerificationRequestStatus::Rejected => "تم رفض طلب وصولك إلى {$this->compoundName} أثناء التحقق.",
            VerificationRequestStatus::MoreInfoRequested => "تحتاج إدارة المجمع إلى معلومات إضافية قبل الموافقة على وصولك إلى {$this->compoundName}.",
            VerificationRequestStatus::PendingReview => "طلب وصولك إلى {$this->compoundName} ما زال قيد المراجعة.",
        };
    }

    private function unitLine(): string
    {
        return $this->unitNumber
            ? "This decision is linked to unit {$this->unitNumber}."
            : 'This decision is not linked to a specific unit.';
    }

    private function unitLineAr(): string
    {
        return $this->unitNumber
            ? "هذا القرار مرتبط بالوحدة {$this->unitNumber}."
            : 'هذا القرار غير مرتبط بوحدة محددة.';
    }

    private function actionLabel(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::MoreInfoRequested => 'Provide information',
            VerificationRequestStatus::Approved => 'Open resident app',
            VerificationRequestStatus::Rejected, VerificationRequestStatus::PendingReview => 'Review account',
        };
    }

    private function actionLabelAr(): string
    {
        return match ($this->status) {
            VerificationRequestStatus::MoreInfoRequested => 'تقديم المعلومات',
            VerificationRequestStatus::Approved => 'فتح تطبيق الساكن',
            VerificationRequestStatus::Rejected, VerificationRequestStatus::PendingReview => 'مراجعة الحساب',
        };
    }
}
