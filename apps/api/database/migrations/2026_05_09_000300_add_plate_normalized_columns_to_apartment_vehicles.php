<?php

use App\Enums\PlateFormat;
use App\Services\Apartments\PlateNormalizer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartment_vehicles', function (Blueprint $table): void {
            $table->string('plate_format')->default(PlateFormat::LettersNumbers->value)->after('plate');
            $table->string('plate_letters_ar')->nullable()->after('plate_format');
            $table->string('plate_letters_en')->nullable()->after('plate_letters_ar');
            $table->string('plate_digits')->default('')->after('plate_letters_en');
            $table->string('plate_digits_normalized')->default('')->after('plate_digits');
            $table->string('plate_normalized')->default('')->after('plate_digits_normalized');
            $table->index('plate_normalized');
            $table->index('plate_letters_ar');
        });

        $normalizer = app(PlateNormalizer::class);
        DB::table('apartment_vehicles')->orderBy('id')->chunkById(200, function ($rows) use ($normalizer): void {
            foreach ($rows as $row) {
                $digits = preg_replace('/\D/u', '', (string) $row->plate) ?? '';
                $letters = trim(preg_replace('/[\d\s]/u', '', (string) $row->plate) ?? '');
                $format = $letters === '' ? PlateFormat::NumbersOnly->value : PlateFormat::LettersNumbers->value;
                $normalized = $normalizer->normalize($format, $letters !== '' ? $letters : null, $digits);
                DB::table('apartment_vehicles')->where('id', $row->id)->update([
                    'plate_format' => $format,
                    'plate_letters_ar' => $normalized->lettersAr,
                    'plate_letters_en' => $normalized->lettersEn,
                    'plate_digits' => $normalized->digits,
                    'plate_digits_normalized' => $normalized->digitsNormalized,
                    'plate_normalized' => $normalized->plateNormalized,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('apartment_vehicles', function (Blueprint $table): void {
            $table->dropIndex(['plate_normalized']);
            $table->dropIndex(['plate_letters_ar']);
            $table->dropColumn([
                'plate_format', 'plate_letters_ar', 'plate_letters_en',
                'plate_digits', 'plate_digits_normalized', 'plate_normalized',
            ]);
        });
    }
};
