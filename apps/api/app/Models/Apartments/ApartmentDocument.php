<?php

namespace App\Models\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentDocumentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApartmentDocument extends Model
{
    /** @use HasFactory<ApartmentDocumentFactory> */
    use HasFactory;

    protected $fillable = [
        'unit_id',
        'uploaded_by_user_id',
        'document_type',
        'file_path',
        'mime_type',
        'size_bytes',
        'status',
        'version',
        'replaced_by_id',
    ];

    protected static function newFactory(): ApartmentDocumentFactory
    {
        return ApartmentDocumentFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'document_type' => ApartmentDocumentType::class,
            'status' => ApartmentDocumentStatus::class,
            'version' => 'integer',
            'size_bytes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    /**
     * @return HasMany<ApartmentDocumentVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ApartmentDocumentVersion::class);
    }
}
