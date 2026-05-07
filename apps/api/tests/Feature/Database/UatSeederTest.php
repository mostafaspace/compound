<?php

namespace Tests\Feature\Database;

use App\Models\Property\Compound;
use App\Models\User;
use Database\Seeders\UatSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UatSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_uat_personas_are_scoped_to_next_point_with_org_chart_data(): void
    {
        $this->seed(UatSeeder::class);

        $nextPoint = Compound::query()->where('code', 'NEXT-POINT')->firstOrFail();

        $compoundScopedEmails = [
            'compound-admin@uat.compound.local',
            'president@uat.compound.local',
            'board-member@uat.compound.local',
            'finance-reviewer@uat.compound.local',
            'security-guard@uat.compound.local',
            'resident@uat.compound.local',
            'resident-owner@uat.compound.local',
            'resident-tenant@uat.compound.local',
            'ahmed.hassan@uat.compound.local',
            'sara.mohamed@uat.compound.local',
            'omar.khalil@uat.compound.local',
            'nour.eldin@uat.compound.local',
            'fatima.ibrahim@uat.compound.local',
        ];

        foreach ($compoundScopedEmails as $email) {
            $this->assertDatabaseHas('users', [
                'email' => $email,
                'compound_id' => $nextPoint->id,
            ]);
        }

        $this->assertDatabaseHas('users', [
            'email' => 'super-admin@uat.compound.local',
            'compound_id' => null,
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'support-agent@uat.compound.local',
            'compound_id' => null,
        ]);

        $residentIds = User::query()
            ->whereIn('email', [
                'resident@uat.compound.local',
                'resident-owner@uat.compound.local',
                'resident-tenant@uat.compound.local',
                'ahmed.hassan@uat.compound.local',
                'sara.mohamed@uat.compound.local',
                'omar.khalil@uat.compound.local',
                'nour.eldin@uat.compound.local',
                'fatima.ibrahim@uat.compound.local',
            ])
            ->pluck('id');

        $this->assertSame(
            $residentIds->count(),
            $nextPoint->units()
                ->whereHas('apartmentResidents', fn ($query) => $query->whereIn('user_id', $residentIds))
                ->count(),
        );

        $this->assertDatabaseHas('representative_assignments', [
            'compound_id' => $nextPoint->id,
            'role' => 'president',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('representative_assignments', [
            'compound_id' => $nextPoint->id,
            'role' => 'building_representative',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('representative_assignments', [
            'compound_id' => $nextPoint->id,
            'role' => 'floor_representative',
            'is_active' => true,
        ]);
    }
}
