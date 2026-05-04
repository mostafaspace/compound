<?php

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['status' => 'ok', 'service' => 'Compound Management API']);
});

Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})
    ->middleware('auth:sanctum')
    ->withoutMiddleware([VerifyCsrfToken::class]);
