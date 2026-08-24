<?php

use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\PaymentCategoryController;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::post('/login', [AuthController::class, 'login']);

// Public signed PDF (untuk dibagikan via WhatsApp tanpa login)
Route::get('/public/invoices/{invoice}/pdf', [InvoiceController::class, 'publicPdf'])
    ->middleware('signed')->name('public.invoices.pdf');
Route::get('/public/receipts/{receipt}/pdf', [ReceiptController::class, 'publicPdf'])
    ->middleware('signed')->name('public.receipts.pdf');

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/photo', [ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo', [ProfileController::class, 'deletePhoto']);

    // Settings
    Route::get('/settings', [SettingController::class, 'show']);
    Route::post('/settings', [SettingController::class, 'update']);

    // Payment Categories (Biaya Default)
    Route::get('/payment-categories', [PaymentCategoryController::class, 'index']);
    Route::put('/payment-categories', [PaymentCategoryController::class, 'update']);

    // Invoice number generator
    Route::get('/invoices/generate-number', [InvoiceController::class, 'generateNumber']);

    // Invoices CRUD
    Route::apiResource('invoices', InvoiceController::class);

    // PDF Download
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
    Route::get('/invoices/{invoice}/share-url', [InvoiceController::class, 'shareUrl']);

    // Receipt number generator
    Route::get('/receipts/generate-number', [ReceiptController::class, 'generateNumber']);

    // Receipts CRUD
    Route::apiResource('receipts', ReceiptController::class);

    // Receipt PDF Download
    Route::get('/receipts/{receipt}/pdf', [ReceiptController::class, 'downloadPdf']);
    Route::get('/receipts/{receipt}/share-url', [ReceiptController::class, 'shareUrl']);
});
