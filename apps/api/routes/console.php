<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('announcements:publish-due', function () {
    $count = app(\App\Services\AnnouncementService::class)->publishDueScheduled();

    $this->info("Published {$count} scheduled announcements.");
})->purpose('Publish due scheduled announcements and send notifications');

Artisan::command('announcements:expire-due', function () {
    $count = app(\App\Services\AnnouncementService::class)->expireDueAnnouncements();

    $this->info("Expired {$count} announcements.");
})->purpose('Mark due expired announcements as expired');

Schedule::command('dues:process')->dailyAt('07:00');
