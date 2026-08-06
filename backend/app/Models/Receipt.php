<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Receipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'receipt_number',
        'date',
        'received_from',
        'amount',
        'amount_in_words',
        'payment_category',
        'description',
    ];
}
