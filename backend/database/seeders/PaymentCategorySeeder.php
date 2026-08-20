<?php

namespace Database\Seeders;

use App\Models\PaymentCategory;
use Illuminate\Database\Seeder;

class PaymentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Admission Fee',      'default_amount' => 0],
            ['name' => 'Registration Fee',   'default_amount' => 0],
            ['name' => 'SPP',                'default_amount' => 0],
            ['name' => 'Development Fee',    'default_amount' => 0],
        ];

        foreach ($categories as $cat) {
            PaymentCategory::updateOrCreate(
                ['name' => $cat['name']],
                ['default_amount' => $cat['default_amount']]
            );
        }
    }
}
