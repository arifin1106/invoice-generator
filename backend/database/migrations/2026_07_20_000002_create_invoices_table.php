<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->date('date');
            $table->date('due_date');
            $table->string('student_name');
            $table->string('student_level');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('amount_received', 15, 2)->default(0);
            $table->decimal('remaining_balance', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->enum('status', ['paid', 'partial', 'unpaid'])->default('unpaid');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
