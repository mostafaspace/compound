<?php

namespace App\Models\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\User;
use Database\Factories\Apartments\ApartmentDocumentVersionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentDocumentVersion extends Model
{
    /** @use HasFactory<ApartmentDocumentVersionFactory> */
    use HasFactory;

    protected $fillable = [
        'apartment_document_id',
        'uploaded_by',
        'file_path',
        'mime_type',
        'size_bytes',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected static function newFactory(): ApartmentDocumentVersionFactory
    {
        return ApartmentDocumentVersionFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ApartmentDocumentVersionStatus::class,
            'reviewed_at' => 'datetime',
            'size_bytes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ApartmentDocument, $this>
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(ApartmentDocument::class, 'apartment_document_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
