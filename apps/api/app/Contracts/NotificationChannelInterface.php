<?php

namespace App\Contracts;

use App\Models\User;

interface NotificationChannelInterface
{
    /**
     * The channel name this adapter handles (push | email | sms).
     */
    public function channelName(): string;

    /**
     * Dispatch a notification to the given user.
     *
     * @param  array{title: string, body: string, subject?: string}  $payload
     * @return array{provider: string, response: array}
     *
     * @throws \RuntimeException on hard failure
     */
    public function dispatch(User $user, array $payload): array;
}
