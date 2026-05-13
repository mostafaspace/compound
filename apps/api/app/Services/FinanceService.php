<?php

namespace App\Services;

use App\Enums\CampaignStatus;
use App\Enums\ChargeFrequency;
use App\Enums\LedgerEntryType;
use App\Enums\NotificationCategory;
use App\Enums\PaymentStatus;
use App\Enums\VerificationStatus;
use App\Models\Finance\ChargeType;
use App\Models\Finance\CollectionCampaign;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\RecurringCharge;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Unit;
use App\Models\User;
use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
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
        ?string $paymentDate = null,
        ?string $notes = null,
        ?UploadedFile $proof = null,
        array $ledgerEntryIds = [],
    ): PaymentSubmission {
        return DB::transaction(function () use ($account, $submitter, $amount, $currency, $method, $reference, $paymentDate, $notes, $proof, $ledgerEntryIds): PaymentSubmission {
            $path = null;

            if ($proof) {
                $extension = $proof->getClientOriginalExtension() ?: $proof->extension() ?: 'bin';
                $path = $proof->storeAs(
                    'payment-proofs/'.$account->id,
                    Str::ulid()->toBase32().'.'.$extension,
                    config('filesystems.default'),
                );
            }

            $submission = PaymentSubmission::query()->create([
                'unit_account_id' => $account->id,
                'submitted_by' => $submitter->id,
                'amount' => $amount,
                'currency' => strtoupper($currency),
                'method' => $method,
                'reference' => $reference,
                'payment_date' => $paymentDate,
                'proof_path' => $path,
                'status' => PaymentStatus::Submitted->value,
                'notes' => $notes,
                'metadata' => [],
            ]);

            foreach ($ledgerEntryIds as $entryId) {
                $submission->allocations()->create([
                    'ledger_entry_id' => $entryId,
                    'amount' => 0, // In simple submissions, we don't partial-allocate yet
                ]);
            }

            return $submission;
        });
    }

    public function approvePayment(PaymentSubmission $payment, User $reviewer, ?string $description = null): PaymentSubmission
    {
        return DB::transaction(function () use ($payment, $reviewer, $description): PaymentSubmission {
            /** @var PaymentSubmission $lockedPayment */
            $lockedPayment = PaymentSubmission::query()
                ->with('unitAccount.unit.apartmentResidents')
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

    public function requestPaymentCorrection(PaymentSubmission $payment, User $reviewer, string $note): PaymentSubmission
    {
        return DB::transaction(function () use ($payment, $reviewer, $note): PaymentSubmission {
            /** @var PaymentSubmission $lockedPayment */
            $lockedPayment = PaymentSubmission::query()->lockForUpdate()->findOrFail($payment->id);

            if ($lockedPayment->status !== PaymentStatus::Submitted && $lockedPayment->status !== PaymentStatus::UnderReview) {
                abort(422, 'Correction can only be requested for submitted or under-review payments.');
            }

            $lockedPayment->forceFill([
                'status' => PaymentStatus::UnderReview->value,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'correction_note' => $note,
            ])->save();

            $this->notificationService->create(
                userId: $lockedPayment->submitted_by,
                category: NotificationCategory::Finance,
                title: 'Correction requested for your payment',
                body: $note,
                metadata: [
                    'paymentSubmissionId' => $lockedPayment->id,
                    'unitAccountId' => $lockedPayment->unit_account_id,
                    'status' => $lockedPayment->status->value,
                    'titleTranslations' => [
                        'en' => 'Correction requested for your payment',
                        'ar' => 'تم طلب تصحيح لدفعتك',
                    ],
                    'bodyTranslations' => [
                        'en' => $note,
                        'ar' => $note,
                    ],
                ],
                priority: 'high',
            );

            return $lockedPayment->refresh()->load(['unitAccount.unit', 'reviewer', 'submitter']);
        });
    }

    public function userCanAccessAccount(User $user, UnitAccount $account): bool
    {
        return $account->unit()
            ->whereHas('apartmentResidents', function ($query) use ($user): void {
                $query->where('user_id', $user->id)
                    ->where('verification_status', VerificationStatus::Verified->value)
                    ->where(function ($query): void {
                        $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()->toDateString());
                    });
            })
            ->exists();
    }

    // -------------------------------------------------------------------------
    // Charge Types
    // -------------------------------------------------------------------------

    public function createChargeType(array $data, User $actor): ChargeType
    {
        $chargeType = ChargeType::query()->create($data);

        app(AuditLogger::class)->record(
            'dues.charge_type_created',
            actor: $actor,
            metadata: ['charge_type_id' => $chargeType->id, 'code' => $chargeType->code],
        );

        return $chargeType;
    }

    public function updateChargeType(ChargeType $chargeType, array $data, User $actor): ChargeType
    {
        $chargeType->fill($data)->save();

        app(AuditLogger::class)->record(
            'dues.charge_type_updated',
            actor: $actor,
            metadata: ['charge_type_id' => $chargeType->id, 'code' => $chargeType->code],
        );

        return $chargeType->refresh();
    }

    // -------------------------------------------------------------------------
    // Recurring Charges
    // -------------------------------------------------------------------------

    public function createRecurringCharge(array $data, User $actor): RecurringCharge
    {
        $data['created_by'] = $actor->id;

        $charge = RecurringCharge::query()->create($data);

        app(AuditLogger::class)->record(
            'dues.recurring_charge_created',
            actor: $actor,
            metadata: ['recurring_charge_id' => $charge->id, 'compound_id' => $charge->compound_id],
        );

        return $charge;
    }

    public function deactivateRecurringCharge(RecurringCharge $charge, User $actor): RecurringCharge
    {
        $charge->forceFill(['is_active' => false])->save();

        app(AuditLogger::class)->record(
            'dues.recurring_charge_deactivated',
            actor: $actor,
            metadata: ['recurring_charge_id' => $charge->id, 'compound_id' => $charge->compound_id],
        );

        return $charge->refresh();
    }

    public function processRecurringCharges(Carbon $date): int
    {
        $posted = 0;

        $charges = RecurringCharge::query()
            ->where('is_active', true)
            ->where(function ($query) use ($date): void {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', $date->toDateString());
            })
            ->where(function ($query) use ($date): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', $date->toDateString());
            })
            ->get();

        foreach ($charges as $charge) {
            /** @var RecurringCharge $charge */
            if (! $this->isDueOn($charge, $date)) {
                continue;
            }

            DB::transaction(function () use ($charge, $date, &$posted): void {
                $unitAccounts = $this->resolveTargetAccounts($charge);

                foreach ($unitAccounts as $account) {
                    $this->postLedgerEntry(
                        account: $account,
                        type: LedgerEntryType::Charge,
                        amount: (float) $charge->amount,
                        description: $charge->name,
                        actor: null,
                        referenceType: RecurringCharge::class,
                        referenceId: $charge->id,
                    );

                    $posted++;
                }

                $charge->forceFill(['last_run_at' => $date])->save();
            });
        }

        return $posted;
    }

    /**
     * Determine whether a recurring charge is due on the given date.
     */
    private function isDueOn(RecurringCharge $charge, Carbon $date): bool
    {
        $billingDay = $charge->billing_day;

        // If no billing_day set, only match the 1st of each applicable period.
        $dayOfMonth = $billingDay ?? 1;

        if ($date->day !== $dayOfMonth) {
            return false;
        }

        return match ($charge->frequency) {
            ChargeFrequency::Monthly => true,
            ChargeFrequency::Quarterly => in_array($date->month, [1, 4, 7, 10], strict: true),
            ChargeFrequency::Annual => $date->month === 1,
            ChargeFrequency::OneTime => $charge->last_run_at === null,
        };
    }

    /**
     * Resolve the unit accounts that should be charged for a given recurring charge.
     *
     * @return Collection<int, UnitAccount>
     */
    private function resolveTargetAccounts(RecurringCharge $charge): Collection
    {
        return match ($charge->target_type) {
            'all' => UnitAccount::query()
                ->whereHas('unit', fn ($q) => $q->where('compound_id', $charge->compound_id))
                ->get(),
            'floor' => UnitAccount::query()
                ->whereHas('unit', fn ($q) => $q->where('compound_id', $charge->compound_id)->whereIn('floor_id', $charge->target_ids ?? []))
                ->get(),
            'unit' => UnitAccount::query()
                ->whereHas('unit', fn ($q) => $q->where('compound_id', $charge->compound_id)->whereIn('id', $charge->target_ids ?? []))
                ->get(),
            default => collect(),
        };
    }

    // -------------------------------------------------------------------------
    // Collection Campaigns
    // -------------------------------------------------------------------------

    public function createCampaign(array $data, User $actor): CollectionCampaign
    {
        $data['status'] = CampaignStatus::Draft->value;

        $campaign = CollectionCampaign::query()->create($data);

        app(AuditLogger::class)->record(
            'dues.campaign_created',
            actor: $actor,
            metadata: ['campaign_id' => $campaign->id, 'compound_id' => $campaign->compound_id],
        );

        return $campaign;
    }

    public function publishCampaign(CollectionCampaign $campaign, User $actor): CollectionCampaign
    {
        if ($campaign->status !== CampaignStatus::Draft) {
            abort(422, 'Only draft campaigns can be published.');
        }

        $campaign->forceFill([
            'status' => CampaignStatus::Active->value,
            'started_at' => now(),
        ])->save();

        app(AuditLogger::class)->record(
            'dues.campaign_published',
            actor: $actor,
            metadata: ['campaign_id' => $campaign->id],
        );

        return $campaign->refresh();
    }

    public function archiveCampaign(CollectionCampaign $campaign, User $actor): CollectionCampaign
    {
        $campaign->forceFill(['status' => CampaignStatus::Archived->value])->save();

        app(AuditLogger::class)->record(
            'dues.campaign_archived',
            actor: $actor,
            metadata: ['campaign_id' => $campaign->id],
        );

        return $campaign->refresh();
    }

    public function applyCampaignCharges(
        CollectionCampaign $campaign,
        array $unitAccountIds,
        float $amount,
        string $description,
        User $actor,
    ): int {
        if ($campaign->status !== CampaignStatus::Active) {
            abort(422, 'Charges can only be applied to active campaigns.');
        }

        $matchingAccountsCount = UnitAccount::query()
            ->whereIn('id', $unitAccountIds)
            ->whereHas('unit', fn ($query) => $query->where('compound_id', $campaign->compound_id))
            ->count();

        if ($matchingAccountsCount !== count($unitAccountIds)) {
            abort(422, 'All selected unit accounts must belong to the campaign compound.');
        }

        $posted = 0;

        DB::transaction(function () use ($campaign, $unitAccountIds, $amount, $description, $actor, &$posted): void {
            $accounts = UnitAccount::query()->findMany($unitAccountIds);

            foreach ($accounts as $account) {
                $this->postLedgerEntry(
                    account: $account,
                    type: LedgerEntryType::Charge,
                    amount: $amount,
                    description: $description,
                    actor: $actor,
                    referenceType: CollectionCampaign::class,
                    referenceId: $campaign->id,
                );

                $posted++;
            }
        });

        app(AuditLogger::class)->record(
            'dues.campaign_charges_applied',
            actor: $actor,
            metadata: [
                'campaign_id' => $campaign->id,
                'unit_account_count' => $posted,
                'amount' => $amount,
            ],
        );

        return $posted;
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
