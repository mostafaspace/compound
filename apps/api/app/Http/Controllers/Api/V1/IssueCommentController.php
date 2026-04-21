<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueCommentRequest;
use App\Models\Issues\Issue;
use App\Models\Issues\IssueComment;
use Illuminate\Http\JsonResponse;

class IssueCommentController extends Controller
{
    public function store(StoreIssueCommentRequest $request, Issue $issue): JsonResponse
    {
        $comment = IssueComment::create([
            'issue_id' => $issue->id,
            'user_id' => $request->user()?->id,
            'body' => $request->input('body'),
            'is_internal' => $request->input('isInternal', false),
        ]);

        return response()->json([
            'data' => $comment->load('user')
        ], 201);
    }
}
