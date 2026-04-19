<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BuildingController;
use App\Http\Controllers\Api\V1\CompoundController;
use App\Http\Controllers\Api\V1\FloorController;
use App\Http\Controllers\Api\V1\SystemStatusController;
use App\Http\Controllers\Api\V1\UnitController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('/status', SystemStatusController::class)->name('status');

    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
    });

    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,finance_reviewer,support_agent'])
        ->group(function (): void {
            Route::apiResource('compounds', CompoundController::class)->except(['destroy']);
            Route::apiResource('compounds.buildings', BuildingController::class)->shallow()->except(['destroy']);
            Route::apiResource('buildings.floors', FloorController::class)->shallow()->except(['destroy']);
            Route::apiResource('buildings.units', UnitController::class)->shallow()->except(['destroy']);
        });
});
