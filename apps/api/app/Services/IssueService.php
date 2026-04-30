<?php

namespace App\Services;

use App\Enums\NotificationCategory;
use App\Enums\UserRole;
use App\Models\Issues\Issue;
use App\Models\Issues\IssueAttachment;
use App\Models\Issues\IssueComment;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class IssueService
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @param  array{compound_id: string, building_id: string|null, assigned_to: int|null}  $location
     */
    public function createIssue(array $data, User $reporter, array $location): Issue
    {
        $issue = Issue::create([
            'compound_id' => $location['compound_id'],
            'building_id' => $location['building_id'],
            'unit_id' => $data['unit_id'] ?? null,
            'reported_by' => $reporter->id,
            'assigned_to' => $location['assigned_to'],
            'category' => $data['category'],
            'title' => $data['title'],
            'description' => $data['description'],
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'new',
        ]);

        // Notify assignee if one was set
        if ($issue->assigned_to) {
            $this->notificationService->create(
                userId: $issue->assigned_to,
                category: NotificationCategory::Issues,
                title: 'New issue assigned to you',
                body: $issue->title,
                metadata: [
                    'issueId' => $issue->id,
                    'titleTranslations' => [
                        'en' => 'New issue assigned to you',
                        'ar' => 'تم تعيين بلاغ جديد لك',
                    ],
                    'bodyTranslations' => [
                        'en' => $issue->title,
                        'ar' => $issue->title,
                    ],
                ],
            );
        }

        $this->auditLogger->record(
            action: 'issue.created',
            actor: $reporter,
            auditableType: Issue::class,
            auditableId: $issue->id,
            metadata: [
                'issueId' => $issue->id,
                'title' => $issue->title,
                'category' => $issue->category,
                'priority' => $issue->priority,
            ],
        );

        return $issue;
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    public function updateIssue(Issue $issue, array $changes, User $actor): Issue
    {
        $previousStatus = $issue->status;

        if (isset($changes['status'])) {
            $issue->status = $changes['status'];
            if (in_array($issue->status, ['resolved', 'closed'], true)) {
                $issue->resolved_at = $issue->resolved_at ?? now();
            } else {
                $issue->resolved_at = null;
            }
        }

        if (isset($changes['priority'])) {
            $issue->priority = $changes['priority'];
        }

        if (array_key_exists('assigned_to', $changes)) {
            $issue->assigned_to = $changes['assigned_to'];
        }

        if (isset($changes['category'])) {
            $issue->category = $changes['category'];
        }

        $issue->save();

        // Notify reporter if status changed
        if (isset($changes['status']) && $changes['status'] !== $previousStatus && $issue->reported_by) {
            $newStatus = $issue->status;
            $this->notificationService->create(
                userId: $issue->reported_by,
                category: NotificationCategory::Issues,
                title: 'Your issue status changed',
                body: "Status changed to: {$newStatus}",
                metadata: [
                    'issueId' => $issue->id,
                    'previousStatus' => $previousStatus,
                    'newStatus' => $newStatus,
                    'titleTranslations' => [
                        'en' => 'Your issue status changed',
                        'ar' => 'تم تغيير حالة بلاغك',
                    ],
                    'bodyTranslations' => [
                        'en' => "Status changed to: {$newStatus}",
                        'ar' => "تم تغيير الحالة إلى: {$newStatus}",
                    ],
                ],
            );
        }

        $this->auditLogger->record(
            action: 'issue.updated',
            actor: $actor,
            auditableType: Issue::class,
            auditableId: $issue->id,
            metadata: [
                'issueId' => $issue->id,
                'changes' => $changes,
            ],
        );

        return $issue;
    }

    public function addComment(Issue $issue, User $user, string $body, bool $isInternal): IssueComment
    {
        $comment = IssueComment::create([
            'issue_id' => $issue->id,
            'user_id' => $user->id,
            'body' => $body,
            'is_internal' => $isInternal,
        ]);

        // Notify reporter if comment is not internal and the commenter is not the reporter
        if (! $isInternal && $issue->reported_by && $issue->reported_by !== $user->id) {
            $this->notificationService->create(
                userId: $issue->reported_by,
                category: NotificationCategory::Issues,
                title: 'New comment on your issue',
                body: $issue->title,
                metadata: [
                    'issueId' => $issue->id,
                    'commentId' => $comment->id,
                    'titleTranslations' => [
                        'en' => 'New comment on your issue',
                        'ar' => 'تعليق جديد على بلاغك',
                    ],
                    'bodyTranslations' => [
                        'en' => $issue->title,
                        'ar' => $issue->title,
                    ],
                ],
            );
        }

        $this->auditLogger->record(
            action: 'issue.comment_added',
            actor: $user,
            auditableType: Issue::class,
            auditableId: $issue->id,
            metadata: [
                'issueId' => $issue->id,
                'commentId' => $comment->id,
                'isInternal' => $isInternal,
            ],
        );

        return $comment;
    }

    public function escalateIssue(Issue $issue, User $actor, string $reason): Issue
    {
        $previousAssignedTo = $issue->assigned_to;

        $issue->status = 'escalated';
        $issue->metadata = array_merge($issue->metadata ?? [], [
            'escalatedAt' => now()->toIso8601String(),
            'escalatedBy' => $actor->id,
            'escalationReason' => $reason,
        ]);
        $issue->save();

        // Notify reporter
        if ($issue->reported_by) {
            $this->notificationService->create(
                userId: $issue->reported_by,
                category: NotificationCategory::Issues,
                title: 'Issue escalated',
                body: $issue->title,
                metadata: [
                    'issueId' => $issue->id,
                    'reason' => $reason,
                    'titleTranslations' => [
                        'en' => 'Issue escalated',
                        'ar' => 'تم تصعيد البلاغ',
                    ],
                    'bodyTranslations' => [
                        'en' => $issue->title,
                        'ar' => $issue->title,
                    ],
                ],
                priority: 'high',
            );
        }

        // Notify previous assignee
        if ($previousAssignedTo && $previousAssignedTo !== $issue->reported_by) {
            $this->notificationService->create(
                userId: $previousAssignedTo,
                category: NotificationCategory::Issues,
                title: 'Issue escalated',
                body: $issue->title,
                metadata: [
                    'issueId' => $issue->id,
                    'reason' => $reason,
                    'titleTranslations' => [
                        'en' => 'Issue escalated',
                        'ar' => 'تم تصعيد البلاغ',
                    ],
                    'bodyTranslations' => [
                        'en' => $issue->title,
                        'ar' => $issue->title,
                    ],
                ],
                priority: 'high',
            );
        }

        $this->auditLogger->record(
            action: 'issue.escalated',
            actor: $actor,
            auditableType: Issue::class,
            auditableId: $issue->id,
            metadata: [
                'issueId' => $issue->id,
                'reason' => $reason,
            ],
        );

        return $issue;
    }

    public function addAttachment(Issue $issue, User $uploader, UploadedFile $file): IssueAttachment
    {
        $disk = config('filesystems.default');
        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: 'bin';

        $path = $file->storeAs(
            'issue-attachments/'.$issue->id,
            Str::ulid()->toBase32().'.'.$extension,
            $disk,
        );

        $attachment = IssueAttachment::create([
            'issue_id' => $issue->id,
            'uploaded_by' => $uploader->id,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        $this->auditLogger->record(
            action: 'issue.attachment_added',
            actor: $uploader,
            auditableType: Issue::class,
            auditableId: $issue->id,
            metadata: [
                'issueId' => $issue->id,
                'attachmentId' => $attachment->id,
                'originalName' => $attachment->original_name,
                'size' => $attachment->size,
            ],
        );

        return $attachment;
    }

    public function userCanAccessIssue(User $user, Issue $issue): bool
    {
        if ($user->hasAnyEffectiveRole([
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ])) {
            return $this->compoundContext->userCanAccessCompoundById($user, $issue->compound_id);
        }

        return $issue->reported_by === $user->id;
    }
}
