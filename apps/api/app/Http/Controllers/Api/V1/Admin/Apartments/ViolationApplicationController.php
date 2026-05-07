<?php

namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Apartments\ApplyViolationRequest;
use App\Http\Requests\Admin\Apartments\MarkWaivedRequest;
use App\Http\Resources\Apartments\ApartmentViolationResource;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Services\Apartments\ViolationApplicationService;
use Illuminate\Support\Facades\Gate;

class ViolationApplicationController extends Controller
{
    public function __construct(private readonly ViolationApplicationService $service) {}

    public function store(ApplyViolationRequest $request, Unit $unit)
    {
        Gate::authorize('apply', ViolationRule::class);

        $rule = ViolationRule::query()->findOrFail($request->validated('violation_rule_id'));
        abort_if($rule->compound_id !== $unit->compound_id, 422);

        $violation = $this->service->apply($unit, $rule, $request->user(), $request->validated());

        return (new ApartmentViolationResource($violation->load('rule')))->response()->setStatusCode(201);
    }

    public function markPaid(ApartmentViolation $violation)
    {
        Gate::authorize('apply', ViolationRule::class);

        return new ApartmentViolationResource($this->service->markPaid($violation)->load('rule'));
    }

    public function markWaived(MarkWaivedRequest $request, ApartmentViolation $violation)
    {
        Gate::authorize('apply', ViolationRule::class);

        return new ApartmentViolationResource(
            $this->service->markWaived($violation, $request->string('reason')->toString())->load('rule')
        );
    }
}
