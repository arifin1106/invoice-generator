<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@jacos.id'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password123'),
            ]
        );

        $this->call([
            SettingSeeder::class,
        ]);
    }
}
