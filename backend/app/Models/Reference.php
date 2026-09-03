<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reference extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'slug',
        'initials',
        'name',
        'title',
        'email',
        'photo_url',
        'summary',
        'sort_order',
        'archived_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'archived_at' => 'datetime',
        'sort_order' => 'integer',
    ];
}
