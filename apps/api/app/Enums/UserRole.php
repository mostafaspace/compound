<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case CompoundAdmin = 'compound_admin';
    case BoardMember = 'board_member';
    case FinanceReviewer = 'finance_reviewer';
    case SecurityGuard = 'security_guard';
    case ResidentOwner = 'resident_owner';
    case ResidentTenant = 'resident_tenant';
    case SupportAgent = 'support_agent';
}
