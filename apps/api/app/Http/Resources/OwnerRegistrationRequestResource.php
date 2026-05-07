<?php

namespace App\Http\Resources;

use App\Models\OwnerRegistrationRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Crypt;

/**
 * @mixin OwnerRegistrationRequest
 */
class OwnerRegistrationRequestResource extends JsonResource
{
    public function __construct($resource, private readonly bool $includePrivateLogin = false)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'requestToken' => $this->when(isset($this->request_token_plain), $this->request_token_plain),
            'status' => $this->status,
            'fullNameArabic' => $this->full_name_arabic,
            'phone' => $this->phone,
            'email' => $this->email,
            'apartmentCode' => $this->apartment_code,
            'ownerAcknowledged' => $this->owner_acknowledged,
            'building' => [
                'id' => $this->building?->id,
                'code' => $this->building?->code,
                'label' => $this->building?->name,
            ],
            'unit' => UnitResource::make($this->whenLoaded('unit')),
            'user' => UserResource::make($this->whenLoaded('user')),
            'documents' => $this->documents->map(fn ($document): array => [
                'id' => $document->id,
                'type' => $document->type,
                'originalName' => $document->original_name,
                'mimeType' => $document->mime_type,
                'sizeBytes' => $document->size_bytes,
            ])->values(),
            'decisionReason' => $this->decision_reason,
            'reviewedAt' => $this->reviewed_at?->toJSON(),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
            'login' => $this->when($this->status === 'approved', fn () => [
                'email' => $this->email,
                'username' => $this->apartment_code,
                'requiresPasswordReset' => true,
                'passwordSetupToken' => $this->includePrivateLogin ? $this->decryptedPasswordSetupToken() : null,
                'passwordSetupExpiresAt' => $this->password_setup_expires_at?->toJSON(),
            ]),
        ];
    }

    private function decryptedPasswordSetupToken(): ?string
    {
        if (! $this->password_setup_token) {
            return null;
        }

        return Crypt::decryptString($this->password_setup_token);
    }
}
