<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        Setting::updateOrCreate(
            ['id' => 1],
            [
                'institution_name'    => 'Jakarta Cosmopolite Islamic School',
                'institution_address' => 'Jl. Cosmopolite No. 1, Jakarta Selatan, DKI Jakarta 12345',
                'institution_phone'   => '(021) 1234-5678',
                'institution_email'   => 'admin@jacos.sch.id',
                'bank_name'           => 'Bank Central Asia (BCA)',
                'bank_account_number' => '1234567890',
                'bank_account_name'   => 'Jakarta Cosmopolite Islamic School',
                'signer_name'         => 'RR Ratih Retno Sari, S.P',
                'signer_title'        => 'Finance Manager',
                'payment_message'     => "Mohon konfirmasi pembayaran kepada kami setelah melakukan transfer.\nHubungi kami via WhatsApp untuk konfirmasi lebih lanjut.",
            ]
        );
    }
}
