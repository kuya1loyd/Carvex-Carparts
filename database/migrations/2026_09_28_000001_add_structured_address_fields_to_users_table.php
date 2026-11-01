<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'region_code')) {
                $table->string('region_code', 10)->nullable();
            }

            if (! Schema::hasColumn('users', 'province')) {
                $table->string('province', 120)->nullable();
            }

            if (! Schema::hasColumn('users', 'barangay')) {
                $table->string('barangay', 120)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = collect(['region_code', 'province', 'barangay'])
                ->filter(fn ($column) => Schema::hasColumn('users', $column))
                ->values()
                ->all();

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
