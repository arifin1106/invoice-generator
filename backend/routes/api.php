<?php

use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Support\Facades\Route;

// Settings
Route::get('/settings', [SettingController::class, 'show']);
Route::post('/settings', [SettingController::class, 'update']);

// Invoice number generator
Route::get('/invoices/generate-number', [InvoiceController::class, 'generateNumber']);

// Invoices CRUD
Route::apiResource('invoices', InvoiceController::class);

// PDF Download
Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
