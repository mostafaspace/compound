<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueAttachmentRequest;
use App\Http\Resources\Issues\IssueAttachmentResource;
use App\Models\Issues\Issue;
use App\Models\Issues\IssueAttachment;
use App\Models\User;
use App\Services\IssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class IssueAttachmentController extends Controller
{
    public function __construct(private readonly IssueService $issueService) {}

    public function index(Request $request, Issue $issue): AnonymousResourceCollection
    {
        abort_unless($this->issueService->userCanAccessIssue($request->user(), $issue), Response::HTTP_FORBIDDEN);

        return IssueAttachmentResource::collection(
            $issue->attachments()->latest()->get()
        );
    }

    public function store(StoreIssueAttachmentRequest $request, Issue $issue): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($this->issueService->userCanAccessIssue($user, $issue), Response::HTTP_FORBIDDEN);

        $attachment = $this->issueService->addAttachment(
            issue: $issue,
            uploader: $user,
            file: $request->file('file'),
        );

        return IssueAttachmentResource::make($attachment)
            ->response()
            ->setStatusCode(201);
    }

    public function view(Request $request, Issue $issue, IssueAttachment $attachment): \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response
    {
        abort_unless($this->issueService->userCanAccessIssue($request->user(), $issue), Response::HTTP_FORBIDDEN);
        abort_if($attachment->issue_id !== $issue->id, Response::HTTP_BAD_REQUEST);

        return \Illuminate\Support\Facades\Storage::disk($attachment->disk)
            ->response($attachment->path, $attachment->original_name);
    }

    public function destroy(Request $request, Issue $issue, IssueAttachment $attachment): JsonResponse
    {
        abort_unless($this->issueService->userCanManageIssue($request->user(), $issue), Response::HTTP_FORBIDDEN);
        abort_if($attachment->issue_id !== $issue->id, Response::HTTP_BAD_REQUEST);

        $this->issueService->deleteAttachment($attachment, $request->user());

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
