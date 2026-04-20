<?php

namespace App\Enums;

enum VisitorPassStatus: string
{
    case Active = 'active';
    case Used = 'used';
    case Expired = 'expired';
    case Revoked = 'revoked';
}
