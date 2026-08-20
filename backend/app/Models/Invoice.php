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

    protected static function booted(): void
    {
        static::saving(function (Invoice $invoice) {
            $items = $invoice->items;

            if ($items->count() > 0) {
                $totalDiscount = 0;
                $totalPaid = 0;
                $totalFinal = 0;

                foreach ($items as $item) {
                    $discountAmount = 0;
                    if ($item->discount_type && $item->discount_value) {
                        if ($item->discount_type === 'percentage') {
                            $discountAmount = $item->amount * ($item->discount_value / 100);
                        } else {
                            $discountAmount = min((float) $item->discount_value, (float) $item->amount);
                        }
                    }

                    $finalAmount = (float) $item->amount - $discountAmount;
                    $paidAmount = (float) $item->payments->sum('amount');

                    $totalDiscount += $discountAmount;
                    $totalPaid += $paidAmount;
                    $totalFinal += $finalAmount;

                    if ($paidAmount <= 0) {
                        $item->status = 'Belum Lunas';
                    } elseif ($paidAmount >= $finalAmount) {
                        $item->status = 'Lunas';
                    } else {
                        $item->status = 'Sebagian';
                    }
                }

                $invoice->total_amount = $totalFinal;
                $invoice->amount_received = $totalPaid;
                $invoice->remaining_balance = max(0, $totalFinal - $totalPaid);
            } else {
                $invoice->remaining_balance = $invoice->total_amount - $invoice->amount_received;
            }

            if ($invoice->remaining_balance <= 0 && $invoice->amount_received > 0) {
                $invoice->status = 'paid';
            } elseif ($invoice->amount_received > 0) {
                $invoice->status = 'partial';
            } else {
                $invoice->status = 'unpaid';
            }
        });
    }
}
