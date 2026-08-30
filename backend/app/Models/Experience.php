<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Experience extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'type',
        'period',
        'year',
        'tag',
        'title',
        'company',
        'logo_url',
        'website_url',
        'tooltip_desc',
        'albums',
        'certificates',
        'description',
        'highlights',
        'sort_order',
        'archived_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'albums' => 'array',
        'certificates' => 'array',
        'highlights' => 'array',
        'archived_at' => 'datetime',
        'sort_order' => 'integer',
    ];
}
