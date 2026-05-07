<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'owner_registration_request_id',
    'type',
    'original_name',
    'path',
    'mime_type',
    'size_bytes',
])]
class OwnerRegistrationDocument extends Model
{
    /**
     * @return BelongsTo<OwnerRegistrationRequest, $this>
     */
    public function registrationRequest(): BelongsTo
    {
        return $this->belongsTo(OwnerRegistrationRequest::class, 'owner_registration_request_id');
    }
}
