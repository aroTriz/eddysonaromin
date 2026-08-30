<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('experiences', function (Blueprint $table) {
            $table->id();
            $table->string('type')->default('experience'); // 'experience' or 'education'
            $table->string('period');
            $table->string('year');
            $table->string('tag');
            $table->string('title');
            $table->string('company');
            $table->string('logo_url')->nullable();
            $table->string('website_url')->nullable();
            $table->string('tooltip_desc')->nullable();
            $table->json('albums')->nullable();
            $table->json('certificates')->nullable();
            $table->text('description')->nullable();
            $table->json('highlights')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('experiences');
    }
};
