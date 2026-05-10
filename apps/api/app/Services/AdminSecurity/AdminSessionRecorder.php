<?php

namespace App\Services\AdminSecurity;

use App\Models\Admin\AdminSecurityFlag;
use App\Models\Admin\AdminSession;
use App\Models\User;

class AdminSessionRecorder
{
    public function record(User $user, string $ip, string $userAgent): AdminSession
    {
        $hash = md5($userAgent);

        $session = AdminSession::updateOrCreate(
            [
                'user_id'    => $user->id,
                'ip_address' => $ip,
                'device_fingerprint_hash' => $hash,
            ],
            [
                'user_agent'   => $userAgent,
                'device_label' => $this->deriveDeviceLabel($userAgent),
                'last_seen_at' => now(),
                'first_seen_at' => now(),
            ],
        );

        // Ensure first_seen_at is not overwritten on existing records.
        if ($session->wasRecentlyCreated) {
            $session->first_seen_at = now();
            $session->save();
        } else {
            $session->last_seen_at = now();
            $session->saveQuietly();
        }

        $this->createFlags($user, $session, $ip, $hash);

        return $session;
    }

    private function createFlags(User $user, AdminSession $session, string $ip, string $hash): void
    {
        // New IP flag
        $priorIp = AdminSession::where('user_id', $user->id)
            ->where('ip_address', '!=', $ip)
            ->where('id', '!=', $session->id)
            ->exists();

        if ($priorIp && $session->wasRecentlyCreated) {
            AdminSecurityFlag::firstOrCreate(
                [
                    'user_id'          => $user->id,
                    'admin_session_id' => $session->id,
                    'type'             => 'new_ip',
                ],
                [
                    'severity' => 'warning',
                    'status'   => 'open',
                    'summary'  => "Admin {$user->name} logged in from a new IP address ({$ip}).",
                    'metadata' => ['ip' => $ip],
                ],
            );
        }

        // New device flag
        $priorDevice = AdminSession::where('user_id', $user->id)
            ->where('device_fingerprint_hash', '!=', $hash)
            ->where('id', '!=', $session->id)
            ->where('first_seen_at', '<', now()->subDays(30))
            ->exists();

        if ($priorDevice && $session->wasRecentlyCreated) {
            AdminSecurityFlag::firstOrCreate(
                [
                    'user_id'          => $user->id,
                    'admin_session_id' => $session->id,
                    'type'             => 'new_device',
                ],
                [
                    'severity' => 'warning',
                    'status'   => 'open',
                    'summary'  => "Admin {$user->name} logged in from a new device.",
                    'metadata' => ['user_agent' => substr($this->deriveDeviceLabel($session->user_agent ?? ''), 0, 100)],
                ],
            );
        }

        // Too many IPs in 24h
        $recentIpCount = AdminSession::where('user_id', $user->id)
            ->where('last_seen_at', '>', now()->subHours(24))
            ->distinct('ip_address')
            ->count('ip_address');

        if ($recentIpCount > 3) {
            AdminSecurityFlag::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'type'    => 'too_many_ips',
                    'status'  => 'open',
                ],
                [
                    'severity' => 'critical',
                    'summary'  => "Admin {$user->name} has used {$recentIpCount} different IPs in the past 24 hours.",
                    'metadata' => ['ip_count' => $recentIpCount],
                ],
            );
        }
    }

    private function deriveDeviceLabel(string $userAgent): string
    {
        if (str_contains($userAgent, 'Mobile')) {
            return 'Mobile Browser';
        }
        if (str_contains($userAgent, 'Tablet') || str_contains($userAgent, 'iPad')) {
            return 'Tablet Browser';
        }
        if (str_contains($userAgent, 'curl') || str_contains($userAgent, 'PostmanRuntime')) {
            return 'API Client';
        }

        return 'Desktop Browser';
    }
}
