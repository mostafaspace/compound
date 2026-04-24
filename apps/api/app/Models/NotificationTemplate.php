<?php

namespace App\Models;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationTemplate extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'compound_id',
        'category',
        'channel',
        'locale',
        'subject',
        'title_template',
        'body_template',
        'is_active',
    ];

    protected $casts = [
        'category'  => NotificationCategory::class,
        'channel'   => NotificationChannel::class,
        'is_active' => 'boolean',
    ];

    public function compound(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Property\Compound::class);
    }

    /**
     * Render the title or body template with the given context variables.
     * Variables are wrapped in {{double_braces}}.
     */
    public function render(string $template, array $context): string
    {
        foreach ($context as $key => $value) {
            $template = str_replace('{{'.$key.'}}', (string) $value, $template);
        }

        return $template;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
