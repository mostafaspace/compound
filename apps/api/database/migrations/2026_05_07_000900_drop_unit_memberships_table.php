<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('unit_memberships');
    }

    public function down(): void
    {
        // No-op: table was schema-replaced by apartment_residents.
    }
};
