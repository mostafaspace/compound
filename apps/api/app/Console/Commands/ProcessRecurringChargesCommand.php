<?php

namespace App\Console\Commands;

use App\Services\FinanceService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessRecurringChargesCommand extends Command
{
    protected $signature = 'dues:process {--date= : Date to process (Y-m-d, defaults to today)}';

    protected $description = 'Post recurring charge ledger entries for all due charges';

    public function handle(FinanceService $financeService): int
    {
        $dateInput = $this->option('date');

        $date = $dateInput
            ? Carbon::createFromFormat('Y-m-d', $dateInput)->startOfDay()
            : Carbon::today();

        $this->info("Processing recurring charges for {$date->toDateString()}...");

        $count = $financeService->processRecurringCharges($date);

        $this->info("Posted {$count} ledger entr".($count === 1 ? 'y' : 'ies').'.');

        return self::SUCCESS;
    }
}
