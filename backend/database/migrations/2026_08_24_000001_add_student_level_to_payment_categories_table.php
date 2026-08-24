<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEVELS = ['P1', 'P2', 'K1', 'K2', 'Primary'];

    public function up(): void
    {
        Schema::table('payment_categories', function (Blueprint $table) {
            $table->string('student_level')->nullable()->after('name');
        });

        $existing = DB::table('payment_categories')->get();

        foreach ($existing as $cat) {
            $levels = self::LEVELS;
            $first  = array_shift($levels);

            DB::table('payment_categories')
                ->where('id', $cat->id)
                ->update(['student_level' => $first]);

            foreach ($levels as $level) {
                $exists = DB::table('payment_categories')
                    ->where('name', $cat->name)
                    ->where('student_level', $level)
                    ->exists();

                if (! $exists) {
                    DB::table('payment_categories')->insert([
                        'name'           => $cat->name,
                        'student_level'  => $level,
                        'default_amount' => $cat->default_amount,
                        'is_active'      => $cat->is_active,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                }
            }
        }

        Schema::table('payment_categories', function (Blueprint $table) {
            $table->unique(['name', 'student_level']);
        });
    }

    public function down(): void
    {
        Schema::table('payment_categories', function (Blueprint $table) {
            $table->dropUnique(['name', 'student_level']);
        });

        $keep = DB::table('payment_categories')
            ->select('name')
            ->groupBy('name')
            ->pluck('name');

        foreach ($keep as $name) {
            DB::table('payment_categories')
                ->where('name', $name)
                ->whereNotIn('id', function ($query) use ($name) {
                    $query->selectRaw('MIN(id)')
                        ->from('payment_categories')
                        ->where('name', $name);
                })
                ->delete();
        }

        Schema::table('payment_categories', function (Blueprint $table) {
            $table->dropColumn('student_level');
        });
    }
};
