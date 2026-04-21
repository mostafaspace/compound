<?php

namespace App\Services;

use App\Enums\LedgerEntryType;
use App\Enums\NotificationCategory;
use App\Enums\PaymentStatus;
use App\Enums\VerificationStatus;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FinanceService
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function createAccount(Unit $unit, string $currency, ?float $openingBalance, ?User $actor, ?string $description = null): UnitAccount
    {
        return DB::transaction(function () use ($unit, $currency, $openingBalance, $actor, $description): UnitAccount {
            $account = UnitAccount::query()->create([
                'unit_id' => $unit->id,
                'currency' => strtoupper($currency),
                'balance' => '0.00',
            ]);

            if ($openingBalance !== null && $openingBalance !== 0.0) {
                $this->postLedgerEntry(
                    account: $account,
                    type: LedgerEntryType::OpeningBalance,
                    amount: $openingBalance,
                    description: $description ?: 'Opening balance',
                    actor: $actor,
                );
            }

            return $account->refresh();
        });
    }

    public function postLedgerEntry(
        UnitAccount $account,
        LedgerEntryType $type,
        float $amount,
        string $description,
        ?User $actor = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): LedgerEntry {
        return DB::transaction(function () use ($account, $type, $amount, $description, $actor, $referenceType, $referenceId): LedgerEntry {
            /** @var UnitAccount $lockedAccount */
            $lockedAccount = UnitAccount::query()->lockForUpdate()->findOrFail($account->id);

            $entry = LedgerEntry::query()->create([
                'unit_account_id' => $lockedAccount->id,
                'type' => $type->value,
                'amount' => $amount,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'created_by' => $actor?->id,
            ]);

            $lockedAccount->forceFill([
                'balance' => number_format(((float) $lockedAccount->balance) + $amount, 2, '.', ''),
            ])->save();

            return $entry;
        });
    }

    public function submitPayment(
        UnitAccount $account,
        User $submitter,
        float $amount,
        string $currency,
        string $method,
        ?string $reference = null,
        ?string $notes = null,
        ?UploadedFile $proof = null,
    ): PaymentSubmission {
        $path = null;

        if ($proof) {
            $extension = $proof->getClientOriginalExtension() ?: $proof->extension() ?: 'bin';
            $path = $proof->storeAs(
                'payment-proofs/'.$account->id,
                Str::ulid()->toBase32().'.'.$extension,
                config('filesystems.default'),
            );
        }

        return PaymentSubmission::query()->create([
            'unit_account_id' => $account->id,
            'submitted_by' => $submitter->id,
            'amount' => $amount,
            'currency' => strtoupper($currency),
            'method' => $method,
            'reference' => $reference,
            'proof_path' => $path,
            'status' => PaymentStatus::Submitted->value,
            'notes' => $notes,
            'metadata' => [],
        ]);
    }

    public function approvePayment(PaymentSubmission $payment, User $reviewer, ?string $description = null): PaymentSubmission
    {
        return DB::transaction(function () use ($payment, $reviewer, $description): PaymentSubmission {
            /** @var PaymentSubmission $lockedPayment */
            $lockedPayment = PaymentSubmission::query()
                ->with('unitAccount.unit.memberships')
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($lockedPayment->status !== PaymentStatus::Submitted && $lockedPayment->status !== PaymentStatus::UnderReview) {
                abort(422, 'Only submitted payments can be approved.');
            }

            $lockedPayment->forceFill([
                'status' => PaymentStatus::Approved->value,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ])->save();

            $this->postLedgerEntry(
                account: $lockedPayment->unitAccount,
                type: LedgerEntryType::Payment,
                amount: -1 * (float) $lockedPayment->amount,
                description: $description ?: 'Payment approved',
                actor: $reviewer,
                referenceType: $lockedPayment::class,
                referenceId: $lockedPayment->id,
            );

            $this->notifySubmitter($lockedPayment, 'approved');

            return $lockedPayment->refresh()->load(['unitAccount.unit', 'reviewer', 'submitter']);
        });
    }

    public function rejectPayment(PaymentSubmission $payment, User $reviewer, string $reason): PaymentSubmission
    {
        return DB::transaction(function () use ($payment, $reviewer, $reason): PaymentSubmission {
            /** @var PaymentSubmission $lockedPayment */
            $lockedPayment = PaymentSubmission::query()->lockForUpdate()->findOrFail($payment->id);

            if ($lockedPayment->status !== PaymentStatus::Submitted && $lockedPayment->status !== PaymentStatus::UnderReview) {
                abort(422, 'Only submitted payments can be rejected.');
            }

            $lockedPayment->forceFill([
                'status' => PaymentStatus::Rejected->value,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => $reason,
            ])->save();

            $this->notifySubmitter($lockedPayment, 'rejected', $reason);

            return $lockedPayment->refresh()->load(['unitAccount.unit', 'reviewer', 'submitter']);
        });
    }

    public function userCanAccessAccount(User $user, UnitAccount $account): bool
    {
        return $account->unit()
            ->whereHas('memberships', function ($query) use ($user): void {
                $query->where('user_id', $user->id)
                    ->where('verification_status', VerificationStatus::Verified->value)
                    ->where(function ($query): void {
                        $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()->toDateString());
                    });
            })
            ->exists();
    }

    private function notifySubmitter(PaymentSubmission $payment, string $decision, ?string $reason = null): void
    {
        if (! $payment->submitted_by) {
            return;
        }

        $approved = $decision === 'approved';

        $this->notificationService->create(
            userId: $payment->submitted_by,
            category: NotificationCategory::Finance,
            title: $approved ? 'Payment approved' : 'Payment rejected',
            body: $approved
                ? "Your payment of {$payment->amount} {$payment->currency} was approved."
                : "Your payment of {$payment->amount} {$payment->currency} was rejected.",
            metadata: [
                'paymentSubmissionId' => $payment->id,
                'unitAccountId' => $payment->unit_account_id,
                'status' => $payment->status->value,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'reason' => $reason,
                'titleTranslations' => [
                    'en' => $approved ? 'Payment approved' : 'Payment rejected',
                    'ar' => $approved ? 'تمت الموافقة على الدفعة' : 'تم رفض الدفعة',
                ],
                'bodyTranslations' => [
                    'en' => $approved
                        ? "Your payment of {$payment->amount} {$payment->currency} was approved."
                        : "Your payment of {$payment->amount} {$payment->currency} was rejected.",
                    'ar' => $approved
                        ? "تمت الموافقة على دفعتك بقيمة {$payment->amount} {$payment->currency}."
                        : "تم رفض دفعتك بقيمة {$payment->amount} {$payment->currency}.",
                ],
            ],
            priority: $approved ? 'normal' : 'high',
        );
    }
}
