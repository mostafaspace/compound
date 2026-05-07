<?php

namespace App\Enums;

enum ApartmentDocumentType: string
{
    case OwnershipProof = 'ownership_proof';
    case Lease = 'lease';
    case IdCopy = 'id_copy';
    case UtilityBill = 'utility_bill';
    case Other = 'other';
}
