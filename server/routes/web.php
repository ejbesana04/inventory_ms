<?php

use App\Http\Controllers\Auth\SessionAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/login', [SessionAuthController::class, 'login']);
Route::post('/logout', [SessionAuthController::class, 'logout'])->middleware('auth:sanctum');
