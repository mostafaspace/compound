<?php

namespace App\Enums;

enum VehicleNotificationSenderMode: string
{
    case Anonymous = 'anonymous';
    case Identified = 'identified';
    case Admin = 'admin';
}
