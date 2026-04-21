<?php

namespace Database\Factories\Finance;

use App\Models\Finance\UnitAccount;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnitAccount>
 */
class UnitAccountFactory extends Factory
{
    protected $model = UnitAccount::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'balance' => '0.00',
            'currency' => 'EGP',
        ];
    }
}
