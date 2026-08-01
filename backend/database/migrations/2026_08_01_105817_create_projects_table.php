<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category');          // personal | academic
            $table->string('type');              // documentation | ai-tools | game | web-app | ml-data | ar-mobile | networking
            $table->text('summary');
            $table->longText('description')->nullable();
            $table->string('role')->nullable();
            $table->string('year', 4)->nullable();
            $table->boolean('featured')->default(false);
            $table->json('technologies');
            $table->string('url')->nullable();
            $table->string('source_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['category', 'type']);
            $table->index('featured');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
