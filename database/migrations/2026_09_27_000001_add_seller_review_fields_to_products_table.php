<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('seller_id')->nullable()->after('category_id')->constrained('users')->nullOnDelete();
            $table->string('listing_status', 20)->default('approved')->after('is_active')->index();
            $table->text('review_note')->nullable()->after('listing_status');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['seller_id']);
            $table->dropIndex(['listing_status']);
            $table->dropColumn(['seller_id', 'listing_status', 'review_note']);
        });
    }
};
