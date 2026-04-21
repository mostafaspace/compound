<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueAttachmentRequest;
use App\Http\Resources\Issues\IssueAttachmentResource;
use App\Models\Issues\Issue;
use App\Services\IssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IssueAttachmentController extends Controller
{
    public function __construct(private readonly IssueService $issueService) {}

    public function index(Issue $issue): AnonymousResourceCollection
    {
        return IssueAttachmentResource::collection(
            $issue->attachments()->latest()->get()
        );
    }

    public function store(StoreIssueAttachmentRequest $request, Issue $issue): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $attachment = $this->issueService->addAttachment(
            issue: $issue,
            uploader: $user,
            file: $request->file('file'),
        );

        return IssueAttachmentResource::make($attachment)
            ->response()
            ->setStatusCode(201);
    }
}
