<?php

namespace Tests\Feature\Services\Apartments;

use App\Enums\PlateFormat;
use App\Services\Apartments\PlateNormalizer;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PlateNormalizerTest extends TestCase
{
    public static function letterCases(): array
    {
        return [
            'arabic letters and arabic digits' => [
                PlateFormat::LettersNumbers->value,
                'أ ب ج', '١٢٣٤',
                'A B G', '1234',
                'abg1234',
            ],
            'arabic letters and latin digits' => [
                PlateFormat::LettersNumbers->value,
                'م ن', '7788',
                'M N', '7788',
                'mn7788',
            ],
            'numbers only arabic' => [
                PlateFormat::NumbersOnly->value,
                null, '٩٨٧٦٥',
                null, '98765',
                '98765',
            ],
        ];
    }

    #[DataProvider('letterCases')]
    public function test_normalize(string $format, ?string $letters, string $digits, ?string $lettersEn, string $digitsLatin, string $normalized): void
    {
        $result = app(PlateNormalizer::class)->normalize($format, $letters, $digits);
        $this->assertSame($lettersEn, $result->lettersEn);
        $this->assertSame($digitsLatin, $result->digitsNormalized);
        $this->assertSame($normalized, $result->plateNormalized);
    }

    public function test_search_terms_handles_either_script(): void
    {
        $terms = app(PlateNormalizer::class)->searchTerms('أ ب ج ١٢٣٤');
        $this->assertSame('abg1234', $terms['normalized']);
        $this->assertSame('أ ب ج', trim($terms['lettersAr']));
        $this->assertSame('1234', $terms['digitsNormalized']);
    }
}
