<?php

namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Apartments\StoreViolationRuleRequest;
use App\Http\Requests\Admin\Apartments\UpdateViolationRuleRequest;
use App\Http\Resources\Apartments\ViolationRuleResource;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Services\Apartments\ViolationRuleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ViolationRuleController extends Controller
{
    public function __construct(private readonly ViolationRuleService $service) {}

    public function index(Request $request, Compound $compound)
    {
        Gate::authorize('manage', ViolationRule::class);

        return ViolationRuleResource::collection(
            $compound->violationRules()->orderBy('name')->paginate(50)
        );
    }

    public function store(StoreViolationRuleRequest $request, Compound $compound)
    {
        Gate::authorize('manage', ViolationRule::class);

        $rule = $this->service->create($compound, $request->user(), $request->validated());

        return (new ViolationRuleResource($rule))->response()->setStatusCode(201);
    }

    public function update(UpdateViolationRuleRequest $request, Compound $compound, ViolationRule $rule)
    {
        Gate::authorize('manage', ViolationRule::class);
        abort_if($rule->compound_id !== $compound->id, 404);

        return new ViolationRuleResource($this->service->update($rule, $request->validated()));
    }

    public function destroy(Compound $compound, ViolationRule $rule)
    {
        Gate::authorize('manage', ViolationRule::class);
        abort_if($rule->compound_id !== $compound->id, 404);

        $this->service->archive($rule);

        return response()->noContent();
    }
}
