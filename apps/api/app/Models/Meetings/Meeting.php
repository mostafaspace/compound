<?php

namespace App\Models\Meetings;

use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Meetings\MeetingFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Meeting extends Model
{
    /** @use HasFactory<MeetingFactory> */
    use HasFactory;

    use HasUlids;

    protected static function newFactory(): MeetingFactory
    {
        return MeetingFactory::new();
    }

    protected $fillable = [
        'compound_id',
        'title',
        'description',
        'scope',
        'scope_ref_id',
        'status',
        'scheduled_at',
        'duration_minutes',
        'location',
        'location_url',
        'created_by',
        'cancelled_by',
        'cancelled_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /** @return HasMany<MeetingAgendaItem, $this> */
    public function agendaItems(): HasMany
    {
        return $this->hasMany(MeetingAgendaItem::class)->orderBy('position');
    }

    /** @return HasMany<MeetingParticipant, $this> */
    public function participants(): HasMany
    {
        return $this->hasMany(MeetingParticipant::class);
    }

    /** @return HasOne<MeetingMinutes, $this> */
    public function minutes(): HasOne
    {
        return $this->hasOne(MeetingMinutes::class);
    }

    /** @return HasMany<MeetingDecision, $this> */
    public function decisions(): HasMany
    {
        return $this->hasMany(MeetingDecision::class);
    }

    /** @return HasMany<MeetingActionItem, $this> */
    public function actionItems(): HasMany
    {
        return $this->hasMany(MeetingActionItem::class);
    }
}
