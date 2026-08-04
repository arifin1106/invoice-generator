<?php

use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;

// Public Auth routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Settings
    Route::get('/settings', [SettingController::class, 'show']);
    Route::post('/settings', [SettingController::class, 'update']);

    // Invoice number generator
    Route::get('/invoices/generate-number', [InvoiceController::class, 'generateNumber']);

    // Invoices CRUD
    Route::apiResource('invoices', InvoiceController::class);

    // PDF Download
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
});
