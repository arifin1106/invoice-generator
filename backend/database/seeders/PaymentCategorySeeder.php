<?php

namespace Database\Seeders;

use App\Models\PaymentCategory;
use Illuminate\Database\Seeder;

class PaymentCategorySeeder extends Seeder
{
    public const LEVELS = ['P1', 'P2', 'K1', 'K2', 'Primary'];

    public function run(): void
    {
        $categories = ['Admission Fee', 'Registration Fee', 'SPP', 'Development Fee'];

        foreach ($categories as $name) {
            foreach (self::LEVELS as $level) {
                PaymentCategory::updateOrCreate(
                    ['name' => $name, 'student_level' => $level],
                    ['default_amount' => 0]
                );
            }
        }
    }
}
