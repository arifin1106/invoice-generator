<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'description',
        'amount',
        'discount_type',
        'discount_value',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'amount'         => 'decimal:2',
        'discount_value' => 'decimal:2',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getDiscountAmountAttribute(): float
    {
        if (!$this->discount_type || !$this->discount_value) {
            return 0;
        }

        if ($this->discount_type === 'percentage') {
            return $this->amount * ($this->discount_value / 100);
        }

        return min((float) $this->discount_value, (float) $this->amount);
    }

    public function getFinalAmountAttribute(): float
    {
        return (float) $this->amount - $this->discount_amount;
    }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->payments->sum('amount');
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0, $this->final_amount - $this->paid_amount);
    }

    public function getComputedStatusAttribute(): string
    {
        $paid = $this->paid_amount;
        $final = $this->final_amount;

        if ($paid <= 0) {
            return 'Belum Lunas';
        } elseif ($paid >= $final) {
            return 'Lunas';
        }

        return 'Sebagian';
    }
}
