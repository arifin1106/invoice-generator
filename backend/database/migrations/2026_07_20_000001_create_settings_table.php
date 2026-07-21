<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('institution_name')->default('Jakarta Cosmopolite Islamic School');
            $table->string('institution_address')->nullable();
            $table->string('institution_phone')->nullable();
            $table->string('institution_email')->nullable();
            $table->string('institution_logo')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_account_name')->nullable();
            $table->string('signer_name')->default('RR Ratih Retno Sari, S.P');
            $table->string('signer_title')->default('Finance Manager');
            $table->string('signer_signature')->nullable();
            $table->text('payment_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
