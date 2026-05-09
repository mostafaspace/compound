<?php

namespace App\Services\Apartments\Dto;

final readonly class NormalizedPlate
{
    public function __construct(
        public string $plate,
        public ?string $lettersAr,
        public ?string $lettersEn,
        public string $digits,
        public string $digitsNormalized,
        public string $plateNormalized,
    ) {}
}
