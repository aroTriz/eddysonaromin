<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StackGroup extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'label',
        'items',
        'sort_order',
        'archived_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'items' => 'array',
        'archived_at' => 'datetime',
    ];
}
