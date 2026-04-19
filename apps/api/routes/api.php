<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BuildingController;
use App\Http\Controllers\Api\V1\CompoundController;
use App\Http\Controllers\Api\V1\DocumentTypeController;
use App\Http\Controllers\Api\V1\FloorController;
use App\Http\Controllers\Api\V1\ResidentInvitationController;
use App\Http\Controllers\Api\V1\SystemStatusController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\UnitMembershipController;
use App\Http\Controllers\Api\V1\UserDocumentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('/status', SystemStatusController::class)->name('status');

    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');
    Route::get('/resident-invitations/{token}', [ResidentInvitationController::class, 'show'])
        ->name('resident-invitations.show-public');
    Route::post('/resident-invitations/{token}/accept', [ResidentInvitationController::class, 'accept'])
        ->middleware('throttle:login')
        ->name('resident-invitations.accept');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        Route::middleware('role:super_admin,compound_admin,board_member,finance_reviewer,support_agent,resident_owner,resident_tenant')
            ->group(function (): void {
                Route::get('/document-types', [DocumentTypeController::class, 'index'])->name('document-types.index');
                Route::get('/documents', [UserDocumentController::class, 'index'])->name('documents.index');
                Route::post('/documents', [UserDocumentController::class, 'store'])->name('documents.store');
                Route::get('/documents/{userDocument}/download', [UserDocumentController::class, 'download'])
                    ->name('documents.download');
            });
    });

    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,finance_reviewer,support_agent'])
        ->group(function (): void {
            Route::apiResource('compounds', CompoundController::class)->except(['destroy']);
            Route::apiResource('compounds.buildings', BuildingController::class)->shallow()->except(['destroy']);
            Route::apiResource('buildings.floors', FloorController::class)->shallow()->except(['destroy']);
            Route::apiResource('buildings.units', UnitController::class)->shallow()->except(['destroy']);
            Route::post('/compounds/{compound}/archive', [CompoundController::class, 'archive'])->name('compounds.archive');
            Route::post('/buildings/{building}/archive', [BuildingController::class, 'archive'])->name('buildings.archive');
            Route::post('/floors/{floor}/archive', [FloorController::class, 'archive'])->name('floors.archive');
            Route::post('/units/{unit}/archive', [UnitController::class, 'archive'])->name('units.archive');
            Route::get('/units/{unit}/memberships', [UnitMembershipController::class, 'index'])->name('units.memberships.index');
            Route::post('/units/{unit}/memberships', [UnitMembershipController::class, 'store'])->name('units.memberships.store');
            Route::patch('/unit-memberships/{unitMembership}', [UnitMembershipController::class, 'update'])
                ->name('unit-memberships.update');
            Route::post('/unit-memberships/{unitMembership}/end', [UnitMembershipController::class, 'end'])
                ->name('unit-memberships.end');
            Route::get('/resident-invitations', [ResidentInvitationController::class, 'index'])->name('resident-invitations.index');
            Route::post('/resident-invitations', [ResidentInvitationController::class, 'store'])->name('resident-invitations.store');
            Route::post('/resident-invitations/{residentInvitation}/revoke', [ResidentInvitationController::class, 'revoke'])
                ->name('resident-invitations.revoke');
            Route::post('/resident-invitations/{residentInvitation}/resend', [ResidentInvitationController::class, 'resend'])
                ->name('resident-invitations.resend');
            Route::patch('/documents/{userDocument}/review', [UserDocumentController::class, 'review'])->name('documents.review');
        });
});
