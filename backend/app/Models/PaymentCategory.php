<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentCategory extends Model
{
    protected $fillable = [
        'name',
        'default_amount',
        'is_active',
    ];

    protected $casts = [
        'default_amount' => 'decimal:2',
        'is_active'      => 'boolean',
    ];
}
