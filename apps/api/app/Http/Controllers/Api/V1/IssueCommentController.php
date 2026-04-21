<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueCommentRequest;
use App\Http\Resources\Issues\IssueCommentResource;
use App\Models\Issues\Issue;
use App\Services\IssueService;
use Illuminate\Http\JsonResponse;

class IssueCommentController extends Controller
{
    public function __construct(private readonly IssueService $issueService) {}

    public function store(StoreIssueCommentRequest $request, Issue $issue): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $comment = $this->issueService->addComment(
            issue: $issue,
            user: $user,
            body: $request->input('body'),
            isInternal: (bool) $request->input('isInternal', false),
        );

        return IssueCommentResource::make($comment->load('user'))
            ->response()
            ->setStatusCode(201);
    }
}
