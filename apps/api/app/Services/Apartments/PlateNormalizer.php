<?php

namespace App\Services\Apartments;

use App\Enums\PlateFormat;
use App\Services\Apartments\Dto\NormalizedPlate;

class PlateNormalizer
{
    /** @var array<string,string> */
    private const ARABIC_LETTER_MAP = [
        'ا' => 'A', 'أ' => 'A', 'إ' => 'A', 'آ' => 'A',
        'ب' => 'B', 'ت' => 'T', 'ث' => 'T',
        'ج' => 'G', 'ح' => 'H', 'خ' => 'KH',
        'د' => 'D', 'ذ' => 'Z',
        'ر' => 'R', 'ز' => 'Z',
        'س' => 'S', 'ش' => 'SH',
        'ص' => 'S', 'ض' => 'D',
        'ط' => 'T', 'ظ' => 'Z',
        'ع' => 'A', 'غ' => 'GH',
        'ف' => 'F', 'ق' => 'Q',
        'ك' => 'K', 'ل' => 'L', 'م' => 'M', 'ن' => 'N',
        'ه' => 'H', 'و' => 'W', 'ي' => 'Y', 'ى' => 'Y',
    ];

    /** @var array<string,string> */
    private const ARABIC_DIGIT_MAP = [
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
    ];

    public function normalize(string $format, ?string $lettersInput, string $digitsInput): NormalizedPlate
    {
        $format = PlateFormat::from($format);

        $lettersAr = $lettersInput !== null ? $this->cleanLetters($lettersInput) : null;
        $lettersEn = $lettersAr !== null ? $this->transliterate($lettersAr) : null;

        $digits = $this->cleanDigits($digitsInput);
        $digitsNormalized = strtr($digits, self::ARABIC_DIGIT_MAP);

        $plateNormalized = strtolower(($lettersEn !== null ? str_replace(' ', '', $lettersEn) : '').$digitsNormalized);

        $canonical = match ($format) {
            PlateFormat::LettersNumbers => trim(($lettersAr ?? '').' '.$digits),
            PlateFormat::NumbersOnly => $digits,
        };

        return new NormalizedPlate(
            plate: $canonical,
            lettersAr: $lettersAr,
            lettersEn: $lettersEn,
            digits: $digits,
            digitsNormalized: $digitsNormalized,
            plateNormalized: $plateNormalized,
        );
    }

    /** @return array{normalized:string, lettersAr:string, digitsNormalized:string} */
    public function searchTerms(string $query): array
    {
        $query = trim($query);
        $lettersAr = '';
        $lettersLatin = '';
        $digits = '';
        foreach (preg_split('//u', $query, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
            if (isset(self::ARABIC_DIGIT_MAP[$ch]) || ctype_digit($ch)) {
                $digits .= $ch;
            } elseif (isset(self::ARABIC_LETTER_MAP[$ch])) {
                $lettersAr .= $ch.' ';
            } elseif (ctype_alpha($ch)) {
                $lettersLatin .= $ch;
            }
        }
        $lettersAr = rtrim($lettersAr);
        $lettersEn = $this->transliterate($lettersAr);
        $digitsNormalized = strtr($digits, self::ARABIC_DIGIT_MAP);

        // Combine Arabic transliteration with any direct Latin input
        $lettersPart = str_replace(' ', '', $lettersEn).strtolower($lettersLatin);
        $normalized = strtolower($lettersPart.$digitsNormalized);

        return [
            'normalized' => $normalized,
            'lettersAr' => $lettersAr,
            'digitsNormalized' => $digitsNormalized,
        ];
    }

    private function cleanLetters(string $input): string
    {
        $input = preg_replace('/\s+/u', ' ', trim($input)) ?? '';

        return $input;
    }

    private function cleanDigits(string $input): string
    {
        return preg_replace('/\s+/u', '', $input) ?? '';
    }

    private function transliterate(string $arabicLetters): string
    {
        $out = [];
        foreach (preg_split('//u', $arabicLetters, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
            if ($ch === ' ') {
                continue;
            }
            if (isset(self::ARABIC_LETTER_MAP[$ch])) {
                $out[] = self::ARABIC_LETTER_MAP[$ch];
            }
        }

        return implode(' ', $out);
    }
}
