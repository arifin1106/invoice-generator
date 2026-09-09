<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $setting = Setting::first();

        if (!$setting) {
            return;
        }

        $hasBankData = $setting->bank_name
            || $setting->bank_account_number
            || $setting->bank_account_name;

        if (!$hasBankData) {
            return;
        }

        $exists = BankAccount::where('category', 'umum')->exists();

        if ($exists) {
            return;
        }

        BankAccount::create([
            'bank_name'      => $setting->bank_name       ?? '-',
            'account_number' => $setting->bank_account_number ?? '-',
            'account_name'   => $setting->bank_account_name   ?? '-',
            'category'       => 'umum',
        ]);
    }
}
