<?php

namespace App\Models\Documents;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentType extends Model
{
    protected $fillable = [
        'key',
        'name',
        'description',
        'is_required_default',
        'allowed_mime_types',
        'max_file_size_kb',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'allowed_mime_types' => 'array',
            'is_active' => 'boolean',
            'is_required_default' => 'boolean',
            'max_file_size_kb' => 'integer',
        ];
    }

    /**
     * @return HasMany<UserDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(UserDocument::class);
    }
}
