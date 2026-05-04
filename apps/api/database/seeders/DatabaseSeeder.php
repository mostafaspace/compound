<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@compound.local'],
            [
                'name'     => 'Compound Admin',
                'phone'    => '+201000000001',
                'role'     => UserRole::CompoundAdmin->value,
                'status'   => AccountStatus::Active->value,
                'password' => bcrypt('password'),
            ]
        );

        User::firstOrCreate(
            ['email' => 'resident@compound.local'],
            [
                'name'     => 'Demo Resident',
                'phone'    => '+201000000002',
                'role'     => UserRole::ResidentOwner->value,
                'status'   => AccountStatus::Active->value,
                'password' => bcrypt('password'),
            ]
        );

        $this->call([
            RbacSeeder::class,
            DocumentTypeSeeder::class,
            NextPointSeeder::class,
            BaselineSeeder::class,
            UatPersonaSeeder::class,
            PollTransparencySeeder::class,
        ]);
    }
}
