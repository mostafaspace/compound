<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\BuildingController;
use App\Http\Controllers\Api\V1\CompoundController;
use App\Http\Controllers\Api\V1\DocumentTypeController;
use App\Http\Controllers\Api\V1\FloorController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\OrgChartController;
use App\Http\Controllers\Api\V1\RepresentativeAssignmentController;
use App\Http\Controllers\Api\V1\ResidentInvitationController;
use App\Http\Controllers\Api\V1\SystemStatusController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\UnitMembershipController;
use App\Http\Controllers\Api\V1\UserDocumentController;
use App\Http\Controllers\Api\V1\VerificationRequestController;
use App\Http\Controllers\Api\V1\VisitorRequestController;
use App\Http\Controllers\Api\V1\IssueController;
use App\Http\Controllers\Api\V1\IssueCommentController;
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
        Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount'])
            ->name('notifications.unread-count');
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])
            ->name('notifications.read-all');
        Route::post('/notifications/archive-all', [NotificationController::class, 'archiveAll'])
            ->name('notifications.archive-all');
        Route::get('/notifications/{notification}', [NotificationController::class, 'show'])
            ->name('notifications.show');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
            ->name('notifications.read');
        Route::post('/notifications/{notification}/archive', [NotificationController::class, 'archive'])
            ->name('notifications.archive');
        Route::get('/notification-preferences', [NotificationPreferenceController::class, 'show'])
            ->name('notification-preferences.show');
        Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update'])
            ->name('notification-preferences.update');

        Route::middleware('role:super_admin,compound_admin,board_member,finance_reviewer,support_agent,resident_owner,resident_tenant')
            ->group(function (): void {
                Route::get('/document-types', [DocumentTypeController::class, 'index'])->name('document-types.index');
                Route::get('/documents', [UserDocumentController::class, 'index'])->name('documents.index');
                Route::post('/documents', [UserDocumentController::class, 'store'])->name('documents.store');
                Route::get('/documents/{userDocument}/download', [UserDocumentController::class, 'download'])
                    ->name('documents.download');
            });

        Route::middleware('role:resident_owner,resident_tenant')
            ->get('/my/verification-requests', [VerificationRequestController::class, 'mine'])
            ->name('my.verification-requests.index');

        // Issue Management for residents
        Route::get('/my/issues', [IssueController::class, 'myIssues'])->name('my.issues.index');
        Route::post('/issues', [IssueController::class, 'store'])->name('issues.store');
        Route::post('/issues/{issue}/comments', [IssueCommentController::class, 'store'])->name('issues.comments.store');

        Route::middleware('role:super_admin,compound_admin,security_guard,support_agent,resident_owner,resident_tenant')
            ->group(function (): void {
                Route::get('/visitor-requests', [VisitorRequestController::class, 'index'])->name('visitor-requests.index');
                Route::post('/visitor-requests', [VisitorRequestController::class, 'store'])->name('visitor-requests.store');
                Route::post('/visitor-requests/{visitorRequest}/cancel', [VisitorRequestController::class, 'cancel'])
                    ->name('visitor-requests.cancel');
            });

        Route::middleware('role:super_admin,compound_admin,security_guard,support_agent')
            ->group(function (): void {
                Route::post('/visitor-requests/validate-pass', [VisitorRequestController::class, 'validatePass'])
                    ->name('visitor-requests.validate-pass');
                Route::post('/visitor-requests/{visitorRequest}/arrive', [VisitorRequestController::class, 'arrive'])
                    ->name('visitor-requests.arrive');
                Route::post('/visitor-requests/{visitorRequest}/allow', [VisitorRequestController::class, 'allow'])
                    ->name('visitor-requests.allow');
                Route::post('/visitor-requests/{visitorRequest}/deny', [VisitorRequestController::class, 'deny'])
                    ->name('visitor-requests.deny');
                Route::post('/visitor-requests/{visitorRequest}/complete', [VisitorRequestController::class, 'complete'])
                    ->name('visitor-requests.complete');
            });

        // Org chart and responsible-party lookup — visible to all authenticated users
        Route::get('/compounds/{compound}/org-chart', [OrgChartController::class, 'show'])
            ->name('compounds.org-chart');
        Route::get('/units/{unit}/responsible-party', [OrgChartController::class, 'responsibleParty'])
            ->name('units.responsible-party');
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
            Route::get('/verification-requests', [VerificationRequestController::class, 'index'])
                ->name('verification-requests.index');
            Route::patch('/verification-requests/{verificationRequest}/approve', [VerificationRequestController::class, 'approve'])
                ->name('verification-requests.approve');
            Route::patch('/verification-requests/{verificationRequest}/reject', [VerificationRequestController::class, 'reject'])
                ->name('verification-requests.reject');
            Route::patch('/verification-requests/{verificationRequest}/request-more-info', [VerificationRequestController::class, 'requestMoreInfo'])
                ->name('verification-requests.request-more-info');
            Route::patch('/documents/{userDocument}/review', [UserDocumentController::class, 'review'])->name('documents.review');

            Route::middleware('role:super_admin,compound_admin,support_agent')
                ->get('/audit-logs', [AuditLogController::class, 'index'])
                ->name('audit-logs.index');

            // Representative assignments (admin-only mutations)
            Route::get('/compounds/{compound}/representatives', [RepresentativeAssignmentController::class, 'index'])
                ->name('compounds.representatives.index');
            Route::post('/compounds/{compound}/representatives', [RepresentativeAssignmentController::class, 'store'])
                ->name('compounds.representatives.store');
            Route::get('/representative-assignments/{representativeAssignment}', [RepresentativeAssignmentController::class, 'show'])
                ->name('representative-assignments.show');
            Route::patch('/representative-assignments/{representativeAssignment}', [RepresentativeAssignmentController::class, 'update'])
                ->name('representative-assignments.update');
            Route::post('/representative-assignments/{representativeAssignment}/expire', [RepresentativeAssignmentController::class, 'expire'])
                ->name('representative-assignments.expire');
            // Issue Management for admins
            Route::get('/issues', [IssueController::class, 'index'])->name('issues.index');
            Route::get('/issues/{issue}', [IssueController::class, 'show'])->name('issues.show');
            Route::patch('/issues/{issue}', [IssueController::class, 'update'])->name('issues.update');
            Route::put('/issues/{issue}', [IssueController::class, 'update'])->name('issues.update');
        });
});
