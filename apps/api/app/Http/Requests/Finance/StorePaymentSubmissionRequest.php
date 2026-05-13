<?php

namespace App\Http\Requests\Finance;

use App\Enums\LedgerEntryType;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\UnitAccount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePaymentSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $unitAccount = $this->route('unitAccount');
        $unitAccountId = $unitAccount instanceof UnitAccount ? $unitAccount->id : null;

        return [
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999999.99'],
            'currency' => ['nullable', 'string', 'size:3'],
            'method' => ['required', 'string', 'max:80'],
            'reference' => ['nullable', 'string', 'max:120'],
            'payment_date' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'proof' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
            'ledger_entry_ids' => ['nullable', 'array'],
            'ledger_entry_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('ledger_entries', 'id')->where('unit_account_id', $unitAccountId),
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $unitAccount = $this->route('unitAccount');
                $ledgerEntryIds = array_values(array_unique(array_map('intval', $this->input('ledger_entry_ids', []))));

                if (! $unitAccount instanceof UnitAccount || $ledgerEntryIds === []) {
                    return;
                }

                $entries = LedgerEntry::query()
                    ->where('unit_account_id', $unitAccount->id)
                    ->whereIn('id', $ledgerEntryIds)
                    ->whereIn('type', [LedgerEntryType::Charge->value, LedgerEntryType::Penalty->value])
                    ->where('amount', '>', 0)
                    ->get(['id', 'amount']);

                if ($entries->count() !== count($ledgerEntryIds)) {
                    $validator->errors()->add('ledger_entry_ids', 'Selected contributions must be outstanding charges for this account.');

                    return;
                }

                $selectedCents = $entries->sum(fn (LedgerEntry $entry): int => $this->toCents($entry->amount));
                $submittedCents = $this->toCents($this->input('amount'));

                if ($submittedCents !== $selectedCents) {
                    $validator->errors()->add('amount', 'Contribution amount must match the selected outstanding charges.');
                }
            },
        ];
    }

    private function toCents(mixed $value): int
    {
        return (int) round(((float) $value) * 100);
    }
}
