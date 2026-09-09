<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE invoice_items ALTER COLUMN status TYPE VARCHAR(50) USING status::text');
            DB::statement("ALTER TABLE invoice_items ALTER COLUMN status SET DEFAULT 'Belum Lunas'");
        } else {
            DB::statement("ALTER TABLE invoice_items MODIFY status VARCHAR(50) NOT NULL DEFAULT 'Belum Lunas'");
        }
    }

    public function down(): void
    {
        // Pada PostgreSQL downgrade memerlukan pembuatan ulang enum; lakukan manual jika perlu.
    }
};
