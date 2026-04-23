<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->index(['actor_id', 'created_at'], 'audit_logs_actor_created_idx');
            $table->index(['method', 'created_at'], 'audit_logs_method_created_idx');
            $table->index(['status_code', 'created_at'], 'audit_logs_status_created_idx');
        });

        Schema::table('issues', function (Blueprint $table): void {
            $table->index(['compound_id', 'status', 'priority'], 'issues_compound_status_priority_idx');
            $table->index(['assigned_to', 'status'], 'issues_assigned_status_idx');
            $table->index(['reported_by', 'created_at'], 'issues_reported_created_idx');
            $table->index(['building_id', 'status'], 'issues_building_status_idx');
        });

        Schema::table('issue_comments', function (Blueprint $table): void {
            $table->index(['issue_id', 'created_at'], 'issue_comments_issue_created_idx');
        });

        Schema::table('collection_campaigns', function (Blueprint $table): void {
            $table->index(['compound_id', 'status'], 'campaigns_compound_status_idx');
        });

        Schema::table('payment_submissions', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'payments_status_created_idx');
            $table->index(['submitted_by', 'created_at'], 'payments_submitter_created_idx');
            $table->index(['unit_account_id', 'status'], 'payments_account_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('payment_submissions', function (Blueprint $table): void {
            $table->dropIndex('payments_status_created_idx');
            $table->dropIndex('payments_submitter_created_idx');
            $table->dropIndex('payments_account_status_idx');
        });

        Schema::table('collection_campaigns', function (Blueprint $table): void {
            $table->dropIndex('campaigns_compound_status_idx');
        });

        Schema::table('issue_comments', function (Blueprint $table): void {
            $table->dropIndex('issue_comments_issue_created_idx');
        });

        Schema::table('issues', function (Blueprint $table): void {
            $table->dropIndex('issues_compound_status_priority_idx');
            $table->dropIndex('issues_assigned_status_idx');
            $table->dropIndex('issues_reported_created_idx');
            $table->dropIndex('issues_building_status_idx');
        });

        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex('audit_logs_actor_created_idx');
            $table->dropIndex('audit_logs_method_created_idx');
            $table->dropIndex('audit_logs_status_created_idx');
        });
    }
};
