<?php

namespace App\Enums;

enum RepresentativeRole: string
{
    case FloorRepresentative = 'floor_representative';
    case BuildingRepresentative = 'building_representative';
    case AssociationMember = 'association_member';
    case President = 'president';
    case Treasurer = 'treasurer';
    case SecurityContact = 'security_contact';
    case AdminContact = 'admin_contact';

    /** Returns the scope level this role is expected to operate at. */
    public function scopeLevel(): string
    {
        return match ($this) {
            self::FloorRepresentative => 'floor',
            self::BuildingRepresentative => 'building',
            default => 'compound',
        };
    }

    /** Singleton roles allow only one active assignment per scope at a time. */
    public function isSingleton(): bool
    {
        return match ($this) {
            self::AssociationMember, self::SecurityContact, self::AdminContact => false,
            default => true,
        };
    }
}
