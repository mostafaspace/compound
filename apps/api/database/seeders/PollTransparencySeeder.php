<?php

namespace Database\Seeders;

use App\Models\Polls\Poll;
use App\Models\Polls\PollNotificationLog;
use App\Models\Polls\PollOption;
use App\Models\Polls\PollType;
use App\Models\Polls\PollViewLog;
use App\Models\Polls\PollVote;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class PollTransparencySeeder extends Seeder
{
    public function run(): void
    {
        $compound = Compound::query()->where('name', 'UAT Demo Compound')->first();

        if (!$compound) {
            $this->command->warn('UAT compound not found — run UatSeeder first.');
            return;
        }

        $admin = User::query()->where('email', 'compound-admin@uat.compound.local')->first();
        $residents = User::query()
            ->where('compound_id', $compound->id)
            ->whereIn('role', ['resident_owner', 'resident_tenant'])
            ->get();

        if ($residents->isEmpty()) {
            $this->command->warn('No residents found — run UatSeeder first.');
            return;
        }

        $pollType = PollType::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'name' => 'Community Decision'],
            [
                'description' => 'Polls requiring community-wide input',
                'color'       => '#2563EB',
                'is_active'   => true,
                'sort_order'  => 1,
                'created_by'  => $admin?->id,
            ],
        );

        $budgetType = PollType::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'name' => 'Budget Approval'],
            [
                'description' => 'Annual and special budget votes',
                'color'       => '#059669',
                'is_active'   => true,
                'sort_order'  => 2,
                'created_by'  => $admin?->id,
            ],
        );

        $this->seedActivePoll($compound, $pollType, $admin, $residents);
        $this->seedClosedPoll($compound, $budgetType, $admin, $residents);
        $this->seedDraftPoll($compound, $pollType, $admin);
    }

    private function seedActivePoll(Compound $compound, PollType $type, ?User $admin, $residents): void
    {
        $poll = Poll::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'title' => 'Pool Operating Hours – Summer 2026'],
            [
                'poll_type_id'  => $type->id,
                'description'   => 'Vote on the preferred pool schedule for summer 2026. The winning option will take effect June 1.',
                'status'        => 'active',
                'scope'         => 'compound_wide',
                'eligibility'   => 'all_residents',
                'allow_multiple' => false,
                'starts_at'     => Carbon::now()->subDays(3),
                'ends_at'       => Carbon::now()->addDays(11),
                'published_at'  => Carbon::now()->subDays(3),
                'created_by'    => $admin?->id,
            ],
        );

        $opt1 = PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => '6 AM – 10 PM'],
            ['sort_order' => 1, 'votes_count' => 0],
        );
        $opt2 = PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => '8 AM – 8 PM'],
            ['sort_order' => 2, 'votes_count' => 0],
        );
        $opt3 = PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => '7 AM – 11 PM (extended)'],
            ['sort_order' => 3, 'votes_count' => 0],
        );

        $options = [$opt1, $opt2, $opt3];
        $units = \App\Models\Property\Unit::query()
            ->where('compound_id', $compound->id)
            ->pluck('id', 'unit_number');

        foreach ($residents as $i => $resident) {
            $chosenOption = $options[$i % count($options)];

            $vote = PollVote::query()->firstOrCreate(
                ['poll_id' => $poll->id, 'user_id' => $resident->id],
                [
                    'unit_id'  => $units->values()->get($i % $units->count()),
                    'voted_at' => Carbon::now()->subDays(2)->addHours($i),
                ],
            );

            if ($vote->options()->count() === 0) {
                $vote->options()->attach($chosenOption->id);
            }

            PollNotificationLog::query()->firstOrCreate(
                ['poll_id' => $poll->id, 'user_id' => $resident->id],
                [
                    'notified_at'  => Carbon::now()->subDays(3)->addMinutes($i * 5),
                    'channel'      => 'push',
                    'delivered'    => true,
                    'delivered_at' => Carbon::now()->subDays(3)->addMinutes($i * 5 + 1),
                ],
            );

            PollViewLog::query()->firstOrCreate(
                ['poll_id' => $poll->id, 'user_id' => $resident->id],
                [
                    'first_viewed_at' => Carbon::now()->subDays(2)->addHours($i),
                    'last_viewed_at'  => Carbon::now()->subDays(1)->addHours($i),
                    'view_count'      => rand(1, 4),
                ],
            );
        }

        $this->updateOptionVoteCounts($poll);
    }

    private function seedClosedPoll(Compound $compound, PollType $type, ?User $admin, $residents): void
    {
        $poll = Poll::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'title' => '2026 Annual Maintenance Budget Approval'],
            [
                'poll_type_id'  => $type->id,
                'description'   => 'Approve or reject the proposed EGP 1.2M annual maintenance budget for 2026.',
                'status'        => 'closed',
                'scope'         => 'compound_wide',
                'eligibility'   => 'unit_owners',
                'allow_multiple' => false,
                'starts_at'     => Carbon::now()->subDays(30),
                'ends_at'       => Carbon::now()->subDays(16),
                'published_at'  => Carbon::now()->subDays(30),
                'closed_at'     => Carbon::now()->subDays(16),
                'created_by'    => $admin?->id,
            ],
        );

        $approve = PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => 'Approve budget as proposed'],
            ['sort_order' => 1, 'votes_count' => 0],
        );
        $reject = PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => 'Reject – request revised proposal'],
            ['sort_order' => 2, 'votes_count' => 0],
        );

        $units = \App\Models\Property\Unit::query()
            ->where('compound_id', $compound->id)
            ->pluck('id', 'unit_number');

        foreach ($residents as $i => $resident) {
            $chosenOption = $i % 3 === 0 ? $reject : $approve;

            $vote = PollVote::query()->firstOrCreate(
                ['poll_id' => $poll->id, 'user_id' => $resident->id],
                [
                    'unit_id'  => $units->values()->get($i % $units->count()),
                    'voted_at' => Carbon::now()->subDays(25)->addHours($i * 3),
                ],
            );

            if ($vote->options()->count() === 0) {
                $vote->options()->attach($chosenOption->id);
            }

            PollNotificationLog::query()->firstOrCreate(
                ['poll_id' => $poll->id, 'user_id' => $resident->id],
                [
                    'notified_at'  => Carbon::now()->subDays(30)->addMinutes($i * 3),
                    'channel'      => 'push',
                    'delivered'    => true,
                    'delivered_at' => Carbon::now()->subDays(30)->addMinutes($i * 3 + 1),
                ],
            );

            PollViewLog::query()->firstOrCreate(
                ['poll_id' => $poll->id, 'user_id' => $resident->id],
                [
                    'first_viewed_at' => Carbon::now()->subDays(28)->addHours($i),
                    'last_viewed_at'  => Carbon::now()->subDays(17)->addHours($i),
                    'view_count'      => rand(2, 6),
                ],
            );
        }

        $this->updateOptionVoteCounts($poll);
    }

    private function seedDraftPoll(Compound $compound, PollType $type, ?User $admin): void
    {
        $poll = Poll::query()->firstOrCreate(
            ['compound_id' => $compound->id, 'title' => 'Parking Policy Change Proposal'],
            [
                'poll_type_id'  => $type->id,
                'description'   => 'Should the compound switch to assigned parking with stickers, or keep open-lot parking?',
                'status'        => 'draft',
                'scope'         => 'compound_wide',
                'eligibility'   => 'all_residents',
                'allow_multiple' => false,
                'starts_at'     => Carbon::now()->addDays(7),
                'ends_at'       => Carbon::now()->addDays(21),
                'created_by'    => $admin?->id,
            ],
        );

        PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => 'Switch to assigned parking with stickers'],
            ['sort_order' => 1, 'votes_count' => 0],
        );
        PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => 'Keep current open-lot parking'],
            ['sort_order' => 2, 'votes_count' => 0],
        );
        PollOption::query()->firstOrCreate(
            ['poll_id' => $poll->id, 'label' => 'Hybrid – assign primary spots, keep overflow open'],
            ['sort_order' => 3, 'votes_count' => 0],
        );
    }

    private function updateOptionVoteCounts(Poll $poll): void
    {
        foreach ($poll->options as $option) {
            $count = $option->votes()->count();
            $option->update(['votes_count' => $count]);
        }
    }
}
