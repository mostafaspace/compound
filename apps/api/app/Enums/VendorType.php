<?php

namespace App\Enums;

enum VendorType: string
{
    case Contractor   = 'contractor';
    case Supplier     = 'supplier';
    case ServiceProvider = 'service_provider';
    case LegalAdvisor = 'legal_advisor';
    case Other        = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Contractor     => 'Contractor',
            self::Supplier       => 'Supplier',
            self::ServiceProvider => 'Service Provider',
            self::LegalAdvisor   => 'Legal Advisor',
            self::Other          => 'Other',
        };
    }
}
