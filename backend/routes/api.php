<?php

use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::post('/login', [AuthController::class, 'login']);

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

    // Invoice number generator
    Route::get('/invoices/generate-number', [InvoiceController::class, 'generateNumber']);

    // Invoices CRUD
    Route::apiResource('invoices', InvoiceController::class);

    // PDF Download
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
});
