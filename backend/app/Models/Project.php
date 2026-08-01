<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Project extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'slug',
        'category',
        'type',
        'summary',
        'description',
        'role',
        'year',
        'featured',
        'technologies',
        'url',
        'source_url',
        'image_url',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'featured' => 'boolean',
        'technologies' => 'array',
    ];

    /**
     * Scope a query to only include featured projects.
     */
    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('featured', true);
    }

    /**
     * Scope a query to a given category (personal | academic).
     */
    public function scopeOfCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope a query to a given type.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Accessor — normalized "Triz AI" style display title.
     */
    public function getDisplayTitleAttribute(): string
    {
        return $this->title;
    }

    /**
     * Helper — humanized type label, e.g. "web-app" => "Web App".
     */
    public function getTypeLabelAttribute(): string
    {
        return Str::of($this->type)
            ->replace('-', ' ')
            ->title()
            ->toString();
    }

    /**
     * Route key uses the slug instead of the primary key.
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
