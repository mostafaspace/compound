<?php

namespace App\Http\Requests\Announcements;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:10240'],
        ];
    }
}
