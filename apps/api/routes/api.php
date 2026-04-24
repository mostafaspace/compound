<?php

use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\ImportBatchController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BuildingController;
use App\Http\Controllers\Api\V1\CompoundController;
use App\Http\Controllers\Api\V1\CompoundOnboardingController;
use App\Http\Controllers\Api\V1\DocumentTypeController;
use App\Http\Controllers\Api\V1\Finance\BudgetController;
use App\Http\Controllers\Api\V1\Finance\ChargeTypeController;
use App\Http\Controllers\Api\V1\Finance\CollectionCampaignController;
use App\Http\Controllers\Api\V1\Finance\ExpenseController;
use App\Http\Controllers\Api\V1\Finance\FinanceReportController;
use App\Http\Controllers\Api\V1\Finance\PaymentSessionController;
use App\Http\Controllers\Api\V1\Finance\PaymentSubmissionController;
use App\Http\Controllers\Api\V1\Finance\PaymentWebhookController;
use App\Http\Controllers\Api\V1\Finance\RecurringChargeController;
use App\Http\Controllers\Api\V1\Finance\ReserveFundController;
use App\Http\Controllers\Api\V1\Finance\UnitAccountController;
use App\Http\Controllers\Api\V1\Finance\VendorController;
use App\Http\Controllers\Api\V1\FloorController;
use App\Http\Controllers\Api\V1\Governance\VoteController;
use App\Http\Controllers\Api\V1\IssueAttachmentController;
use App\Http\Controllers\Api\V1\IssueCommentController;
use App\Http\Controllers\Api\V1\IssueController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\OperationalStatusController;
use App\Http\Controllers\Api\V1\OrgChartController;
use App\Http\Controllers\Api\V1\RepresentativeAssignmentController;
use App\Http\Controllers\Api\V1\ResidentInvitationController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SystemStatusController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\UnitMembershipController;
use App\Http\Controllers\Api\V1\UserDocumentController;
use App\Http\Controllers\Api\V1\VerificationRequestController;
use App\Http\Controllers\Api\V1\VisitorRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('/status', SystemStatusController::class)->name('status');

    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');
    Route::get('/resident-invitations/{token}', [ResidentInvitationController::class, 'show'])
        ->middleware('throttle:invitation-show')
        ->name('resident-invitations.show-public');
    Route::post('/resident-invitations/{token}/accept', [ResidentInvitationController::class, 'accept'])
        ->middleware('throttle:invitation-accept')
        ->name('resident-invitations.accept');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/system/ops-status', OperationalStatusController::class)
            ->middleware('role:super_admin,compound_admin,support_agent')
            ->name('system.ops-status');
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
                Route::post('/documents', [UserDocumentController::class, 'store'])
                    ->middleware('throttle:document-upload')
                    ->name('documents.store');
                Route::get('/documents/{userDocument}/download', [UserDocumentController::class, 'download'])
                    ->name('documents.download');
            });

        Route::middleware('role:resident_owner,resident_tenant')
            ->get('/my/verification-requests', [VerificationRequestController::class, 'mine'])
            ->name('my.verification-requests.index');
        Route::middleware('role:resident_owner,resident_tenant')->group(function (): void {
            Route::get('/my/units', [UnitController::class, 'mine'])
                ->name('my.units.index');
            Route::get('/my/finance/unit-accounts', [UnitAccountController::class, 'mine'])
                ->name('my.finance.unit-accounts.index');
            Route::get('/my/finance/unit-accounts/{unitAccount}', [UnitAccountController::class, 'myShow'])
                ->name('my.finance.unit-accounts.show');
            Route::get('/my/finance/payment-submissions', [PaymentSubmissionController::class, 'mine'])
                ->name('my.finance.payment-submissions.index');
        });

        // Resident transparency: approved spending summary — accessible to all authenticated roles
        Route::middleware('role:super_admin,compound_admin,board_member,finance_reviewer,support_agent,resident_owner,resident_tenant')
            ->get('/finance/expenses/public-summary', [ExpenseController::class, 'publicSummary'])
            ->name('finance.expenses.public-summary');

        // Issue Management for residents
        Route::get('/my/issues', [IssueController::class, 'myIssues'])->name('my.issues.index');
        Route::post('/issues', [IssueController::class, 'store'])
            ->middleware('throttle:issue-create')
            ->name('issues.store');
        Route::post('/issues/{issue}/comments', [IssueCommentController::class, 'store'])->name('issues.comments.store');
        Route::get('/my/announcements', [AnnouncementController::class, 'feed'])->name('my.announcements.index');
        Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show'])->name('announcements.show');
        Route::get('/announcements/{announcement}/attachments/{attachment}/download', [AnnouncementController::class, 'downloadAttachment'])
            ->name('announcements.attachments.download');
        Route::post('/announcements/{announcement}/acknowledge', [AnnouncementController::class, 'acknowledge'])
            ->name('announcements.acknowledge');

        Route::middleware('role:super_admin,compound_admin,security_guard,support_agent,resident_owner,resident_tenant')
            ->group(function (): void {
                Route::get('/visitor-requests', [VisitorRequestController::class, 'index'])->name('visitor-requests.index');
                Route::post('/visitor-requests', [VisitorRequestController::class, 'store'])
                    ->middleware('throttle:visitor-request-create')
                    ->name('visitor-requests.store');
                Route::post('/visitor-requests/{visitorRequest}/cancel', [VisitorRequestController::class, 'cancel'])
                    ->name('visitor-requests.cancel');
            });

        Route::middleware('role:super_admin,compound_admin,security_guard,support_agent')
            ->group(function (): void {
                Route::post('/visitor-requests/validate-pass', [VisitorRequestController::class, 'validatePass'])
                    ->middleware('throttle:visitor-pass-scan')
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
            Route::get('/units', [UnitController::class, 'lookup'])->name('units.lookup');
            Route::post('/buildings/{building}/units/import', [UnitController::class, 'import'])->name('buildings.units.import');
            Route::get('/buildings/{building}/units/export', [UnitController::class, 'export'])->name('buildings.units.export');
            Route::apiResource('compounds', CompoundController::class)->except(['destroy']);
            Route::apiResource('compounds.buildings', BuildingController::class)->shallow()->except(['destroy']);
            Route::apiResource('buildings.floors', FloorController::class)->shallow()->except(['destroy']);
            Route::apiResource('buildings.units', UnitController::class)->shallow()->except(['destroy']);
            Route::post('/compounds/{compound}/archive', [CompoundController::class, 'archive'])->name('compounds.archive');
            Route::get('/compounds/{compound}/onboarding-checklist', CompoundOnboardingController::class)
                ->name('compounds.onboarding-checklist');
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

            // Data import
            Route::middleware('role:super_admin,compound_admin')->group(function (): void {
                Route::get('/imports', [ImportBatchController::class, 'index'])->name('imports.index');
                Route::post('/imports', [ImportBatchController::class, 'store'])->name('imports.store');
                Route::get('/imports/templates/{type}', [ImportBatchController::class, 'template'])->name('imports.template');
                Route::get('/imports/{importBatch}', [ImportBatchController::class, 'show'])->name('imports.show');
            });

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
            Route::post('/issues/{issue}/escalate', [IssueController::class, 'escalate'])->name('issues.escalate');
            Route::get('/issues/{issue}/attachments', [IssueAttachmentController::class, 'index'])->name('issues.attachments.index');
            Route::post('/issues/{issue}/attachments', [IssueAttachmentController::class, 'store'])->name('issues.attachments.store');

            // Official announcements and notices
            Route::get('/announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
            Route::post('/announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
            Route::patch('/announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
            Route::post('/announcements/{announcement}/publish', [AnnouncementController::class, 'publish'])
                ->name('announcements.publish');
            Route::post('/announcements/{announcement}/archive', [AnnouncementController::class, 'archive'])
                ->name('announcements.archive');
            Route::post('/announcements/{announcement}/attachments', [AnnouncementController::class, 'storeAttachment'])
                ->name('announcements.attachments.store');
            Route::get('/announcements/{announcement}/acknowledgements', [AnnouncementController::class, 'acknowledgements'])
                ->name('announcements.acknowledgements');
        });

    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,finance_reviewer'])
        ->prefix('finance')
        ->name('finance.')
        ->group(function (): void {
            Route::get('/unit-accounts', [UnitAccountController::class, 'index'])->name('unit-accounts.index');
            Route::post('/unit-accounts', [UnitAccountController::class, 'store'])->name('unit-accounts.store');
            Route::get('/unit-accounts/{unitAccount}', [UnitAccountController::class, 'show'])->name('unit-accounts.show');
            Route::post('/unit-accounts/{unitAccount}/ledger-entries', [UnitAccountController::class, 'storeLedgerEntry'])
                ->name('unit-accounts.ledger-entries.store');
            Route::get('/payment-submissions', [PaymentSubmissionController::class, 'index'])
                ->name('payment-submissions.index');
            Route::patch('/payment-submissions/{paymentSubmission}/approve', [PaymentSubmissionController::class, 'approve'])
                ->name('payment-submissions.approve');
            Route::patch('/payment-submissions/{paymentSubmission}/reject', [PaymentSubmissionController::class, 'reject'])
                ->name('payment-submissions.reject');
            Route::patch('/payment-submissions/{paymentSubmission}/request-correction', [PaymentSubmissionController::class, 'requestCorrection'])
                ->name('payment-submissions.request-correction');

            // Charge types
            Route::get('/charge-types', [ChargeTypeController::class, 'index'])->name('charge-types.index');
            Route::post('/charge-types', [ChargeTypeController::class, 'store'])->name('charge-types.store');
            Route::get('/charge-types/{chargeType}', [ChargeTypeController::class, 'show'])->name('charge-types.show');
            Route::patch('/charge-types/{chargeType}', [ChargeTypeController::class, 'update'])->name('charge-types.update');

            // Recurring charges
            Route::get('/recurring-charges', [RecurringChargeController::class, 'index'])->name('recurring-charges.index');
            Route::post('/recurring-charges', [RecurringChargeController::class, 'store'])->name('recurring-charges.store');
            Route::get('/recurring-charges/{recurringCharge}', [RecurringChargeController::class, 'show'])->name('recurring-charges.show');
            Route::patch('/recurring-charges/{recurringCharge}/deactivate', [RecurringChargeController::class, 'deactivate'])->name('recurring-charges.deactivate');

            // Collection campaigns
            Route::get('/collection-campaigns', [CollectionCampaignController::class, 'index'])->name('collection-campaigns.index');
            Route::post('/collection-campaigns', [CollectionCampaignController::class, 'store'])->name('collection-campaigns.store');
            Route::get('/collection-campaigns/{campaign}', [CollectionCampaignController::class, 'show'])->name('collection-campaigns.show');
            Route::patch('/collection-campaigns/{campaign}', [CollectionCampaignController::class, 'update'])->name('collection-campaigns.update');
            Route::patch('/collection-campaigns/{campaign}/publish', [CollectionCampaignController::class, 'publish'])->name('collection-campaigns.publish');
            Route::patch('/collection-campaigns/{campaign}/archive', [CollectionCampaignController::class, 'archive'])->name('collection-campaigns.archive');
            Route::post('/collection-campaigns/{campaign}/charges', [CollectionCampaignController::class, 'applyCharges'])->name('collection-campaigns.charges.apply');

            // Collections reports
            Route::prefix('reports')->name('reports.')->group(function (): void {
                Route::get('/summary', [FinanceReportController::class, 'summary'])->name('summary');
                Route::get('/accounts', [FinanceReportController::class, 'accounts'])->name('accounts');
                Route::get('/payment-methods', [FinanceReportController::class, 'paymentMethodBreakdown'])->name('payment-methods');
            });

            // Reserve funds
            Route::get('/reserve-funds', [ReserveFundController::class, 'index'])->name('reserve-funds.index');
            Route::post('/reserve-funds', [ReserveFundController::class, 'store'])->name('reserve-funds.store');
            Route::get('/reserve-funds/{reserveFund}', [ReserveFundController::class, 'show'])->name('reserve-funds.show');
            Route::patch('/reserve-funds/{reserveFund}', [ReserveFundController::class, 'update'])->name('reserve-funds.update');
            Route::get('/reserve-funds/{reserveFund}/movements', [ReserveFundController::class, 'movements'])->name('reserve-funds.movements');
            Route::post('/reserve-funds/{reserveFund}/movements', [ReserveFundController::class, 'storeMovement'])->name('reserve-funds.movements.store');

            // Vendors
            Route::get('/vendors', [VendorController::class, 'index'])->name('vendors.index');
            Route::post('/vendors', [VendorController::class, 'store'])->name('vendors.store');
            Route::get('/vendors/{vendor}', [VendorController::class, 'show'])->name('vendors.show');
            Route::patch('/vendors/{vendor}', [VendorController::class, 'update'])->name('vendors.update');

            // Budgets
            Route::get('/budgets', [BudgetController::class, 'index'])->name('budgets.index');
            Route::post('/budgets', [BudgetController::class, 'store'])->name('budgets.store');
            Route::get('/budgets/{budget}', [BudgetController::class, 'show'])->name('budgets.show');
            Route::patch('/budgets/{budget}', [BudgetController::class, 'update'])->name('budgets.update');
            Route::post('/budgets/{budget}/activate', [BudgetController::class, 'activate'])->name('budgets.activate');
            Route::post('/budgets/{budget}/close', [BudgetController::class, 'close'])->name('budgets.close');
            Route::post('/budgets/{budget}/categories', [BudgetController::class, 'storeCategory'])->name('budgets.categories.store');
            Route::patch('/budgets/{budget}/categories/{category}', [BudgetController::class, 'updateCategory'])->name('budgets.categories.update');

            Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
            Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
            Route::get('/expenses/{expense}', [ExpenseController::class, 'show'])->name('expenses.show');
            Route::post('/expenses/{expense}/approve', [ExpenseController::class, 'approve'])->name('expenses.approve');
            Route::post('/expenses/{expense}/reject', [ExpenseController::class, 'reject'])->name('expenses.reject');
        });

    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,finance_reviewer,support_agent,resident_owner,resident_tenant'])
        ->post('/finance/unit-accounts/{unitAccount}/payment-submissions', [UnitAccountController::class, 'submitPayment'])
        ->middleware('throttle:payment-submit')
        ->name('finance.unit-accounts.payment-submissions.store');

    // Online payments — admin views
    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,finance_reviewer'])
        ->prefix('finance')
        ->name('finance.')
        ->group(function (): void {
            Route::get('/payment-sessions', [PaymentSessionController::class, 'index'])->name('payment-sessions.index');
            Route::get('/gateway-transactions', [PaymentSessionController::class, 'transactions'])->name('gateway-transactions.index');
            Route::post('/gateway-transactions/{gatewayTransaction}/refund', [PaymentSessionController::class, 'refund'])->name('gateway-transactions.refund');
        });

    // Online payments — resident: initiate a session
    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,finance_reviewer,support_agent,resident_owner,resident_tenant'])
        ->post('/finance/payment-sessions', [PaymentSessionController::class, 'store'])
        ->middleware('throttle:payment-submit')
        ->name('finance.payment-sessions.store');

    // Webhooks — no auth, provider signs requests
    Route::post('/webhooks/payments/{provider}', [PaymentWebhookController::class, 'handle'])
        ->name('webhooks.payments');

    // Governance — admin management routes
    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member'])
        ->prefix('governance')
        ->name('governance.')
        ->group(function (): void {
            Route::get('/votes', [VoteController::class, 'index'])->name('votes.index');
            Route::post('/votes', [VoteController::class, 'store'])->name('votes.store');
            Route::get('/votes/{vote}', [VoteController::class, 'show'])->name('votes.show');
            Route::patch('/votes/{vote}', [VoteController::class, 'update'])->name('votes.update');
            Route::post('/votes/{vote}/activate', [VoteController::class, 'activate'])->name('votes.activate');
            Route::post('/votes/{vote}/close', [VoteController::class, 'close'])->name('votes.close');
            Route::post('/votes/{vote}/cancel', [VoteController::class, 'cancel'])->name('votes.cancel');
        });

    // Governance — resident participation routes
    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin,board_member,resident_owner,resident_tenant'])
        ->prefix('governance')
        ->name('governance.resident.')
        ->group(function (): void {
            Route::get('/votes/{vote}/eligibility', [VoteController::class, 'eligibility'])->name('votes.eligibility');
            Route::post('/votes/{vote}/cast', [VoteController::class, 'cast'])->name('votes.cast');
        });

    // Settings — admin only (super_admin / compound_admin)
    Route::middleware(['auth:sanctum', 'role:super_admin,compound_admin'])
        ->prefix('settings')
        ->name('settings.')
        ->group(function (): void {
            Route::get('/', [SettingsController::class, 'namespaces'])->name('namespaces');
            Route::get('/{namespace}', [SettingsController::class, 'show'])->name('show');
            Route::patch('/{namespace}', [SettingsController::class, 'update'])->name('update');
        });
});
