<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'institution_name',
        'institution_address',
        'institution_phone',
        'institution_email',
        'institution_logo',
        'bank_name',
        'bank_account_number',
        'bank_account_name',
        'signer_name',
        'signer_title',
        'signer_signature',
        'payment_message',
    ];
}
