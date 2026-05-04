<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Backwards-compatible alias for the canonical UAT dataset.
 *
 * The only supported UAT accounts are the `*@uat.compound.local` personas
 * created by UatSeeder, all using password `uat-password-2026`.
 */
class UatPersonaSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(UatSeeder::class);
    }
}
