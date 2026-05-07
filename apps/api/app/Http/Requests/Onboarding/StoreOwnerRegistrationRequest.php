<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class StoreOwnerRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'fullNameArabic' => ['required', 'string', 'min:8', 'max:255'],
            'phone' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'apartmentCode' => ['required', 'string', 'max:64', 'regex:/^[A-Z]{1,2}[A-Z]?-F\\d{1,2}-[A-Z]\\d{1,3}$/i'],
            'buildingId' => ['required', 'ulid', 'exists:buildings,id'],
            'deviceId' => ['required', 'string', 'max:191'],
            'ownerAcknowledged' => ['accepted'],
            'idCardPdf' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'contractPdf' => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'handoverPdf' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'fullNameArabic' => 'Full Name In Arabic (الاسم الرباعي)',
            'phone' => 'Phone number (رقم موبايل للتواصل)',
            'email' => 'Email Address',
            'apartmentCode' => 'Apartment Code',
            'buildingId' => 'Building Character',
            'ownerAcknowledged' => 'Owners only confirmation',
            'idCardPdf' => 'ID card (Front and back) PDF',
            'contractPdf' => 'The full contract PDF',
            'handoverPdf' => 'محضر الاستلام',
        ];
    }
}
