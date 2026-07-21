<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'date',
        'due_date',
        'student_name',
        'student_level',
        'total_amount',
        'amount_received',
        'remaining_balance',
        'notes',
        'status',
    ];

    protected $casts = [
        'date'              => 'date',
        'due_date'          => 'date',
        'total_amount'      => 'decimal:2',
        'amount_received'   => 'decimal:2',
        'remaining_balance' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort_order');
    }

    /**
     * Auto-compute remaining_balance before saving.
     */
    protected static function booted(): void
    {
        static::saving(function (Invoice $invoice) {
            $invoice->remaining_balance = $invoice->total_amount - $invoice->amount_received;

            if ($invoice->remaining_balance <= 0) {
                $invoice->status = 'paid';
            } elseif ($invoice->amount_received > 0) {
                $invoice->status = 'partial';
            } else {
                $invoice->status = 'unpaid';
            }
        });
    }
}
