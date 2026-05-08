<?php

namespace Database\Factories;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Models\NotificationTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationTemplateFactory extends Factory
{
    protected $model = NotificationTemplate::class;

    public function definition(): array
    {
        return [
            'compound_id' => null,
            'category' => fake()->randomElement(NotificationCategory::cases())->value,
            'channel' => fake()->randomElement(NotificationChannel::cases())->value,
            'locale' => 'en',
            'subject' => null,
            'title_template' => 'You have a new {{category}} update',
            'body_template' => 'Open the app to see your {{category}} update.',
            'is_active' => true,
        ];
    }

    public function forCategory(NotificationCategory $category): static
    {
        return $this->state(['category' => $category->value]);
    }

    public function forChannel(NotificationChannel $channel): static
    {
        return $this->state(['channel' => $channel->value]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
