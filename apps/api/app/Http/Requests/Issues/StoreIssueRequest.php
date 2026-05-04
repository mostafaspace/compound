<?php

namespace App\Http\Requests\Issues;

use App\Enums\RepresentativeRole;
use App\Models\Property\Building;
use App\Models\Property\Unit;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // Must provide either unitId or buildingId to attach the issue to
        return [
            'unitId' => ['nullable', 'string', Rule::exists('units', 'id')],
            'buildingId' => ['nullable', 'string', Rule::exists('buildings', 'id')],
            'targetRole' => ['nullable', 'string', Rule::in([
                RepresentativeRole::FloorRepresentative->value,
                RepresentativeRole::BuildingRepresentative->value,
                RepresentativeRole::President->value,
                'compound_admin',
            ])],
            'category' => ['required', 'string', Rule::in(['maintenance', 'security', 'cleaning', 'noise', 'other'])],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'priority' => ['nullable', 'string', Rule::in(['low', 'normal', 'high', 'urgent'])],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if (!$this->unitId && !$this->buildingId) {
                $validator->errors()->add('location', 'An issue must be linked to a building or a unit.');
            }

            if ($this->input('targetRole') === RepresentativeRole::FloorRepresentative->value) {
                if (! $this->unitId) {
                    $validator->errors()->add('targetRole', 'Floor representative complaints must be linked to a unit.');

                    return;
                }

                $unit = Unit::query()->find($this->unitId);

                if ($unit?->floor_id === null) {
                    $validator->errors()->add('targetRole', 'This unit is not linked to a floor representative scope.');
                }
            }
        });
    }

    /**
     * @return array{
     *   compound_id: string,
     *   building_id: string|null,
     *   assigned_to: int|null,
     *   requested_target_role: string,
     *   resolved_target_role: string|null
     * }
     */
    public function resolveLocationAndQueue(): array
    {
        $compoundId = null;
        $buildingId = null;
        $floorId = null;
        $assignedTo = null;
        $resolvedTargetRole = null;

        if ($this->unitId) {
            $unit = Unit::findOrFail($this->unitId);
            $compoundId = $unit->compound_id;
            $buildingId = $unit->building_id;
            $floorId = $unit->floor_id;
        } elseif ($this->buildingId) {
            $building = Building::findOrFail($this->buildingId);
            $compoundId = $building->compound_id;
            $buildingId = $building->id;
        }

        $requestedTargetRole = $this->input('targetRole')
            ?: ($floorId ? RepresentativeRole::FloorRepresentative->value : RepresentativeRole::BuildingRepresentative->value);

        [$assignedTo, $resolvedTargetRole] = match ($requestedTargetRole) {
            RepresentativeRole::FloorRepresentative->value => $this->resolveFloorRepresentativeTarget($floorId, $buildingId, $compoundId),
            RepresentativeRole::BuildingRepresentative->value => $this->resolveBuildingRepresentativeTarget($buildingId, $compoundId),
            RepresentativeRole::President->value => $this->resolvePresidentTarget($compoundId),
            'compound_admin' => $this->resolveCompoundAdminTarget($compoundId),
            default => [null, null],
        };

        return [
            'compound_id' => $compoundId,
            'building_id' => $buildingId,
            'assigned_to' => $assignedTo,
            'requested_target_role' => $requestedTargetRole,
            'resolved_target_role' => $resolvedTargetRole,
        ];
    }

    /**
     * @return array{0: int|null, 1: string|null}
     */
    private function resolveFloorRepresentativeTarget(?string $floorId, ?string $buildingId, string $compoundId): array
    {
        if ($floorId) {
            $rep = RepresentativeAssignment::query()
                ->active()
                ->where('floor_id', $floorId)
                ->where('role', RepresentativeRole::FloorRepresentative->value)
                ->first();

            if ($rep?->user_id) {
                return [$rep->user_id, RepresentativeRole::FloorRepresentative->value];
            }
        }

        return $this->resolveBuildingRepresentativeTarget($buildingId, $compoundId);
    }

    /**
     * @return array{0: int|null, 1: string|null}
     */
    private function resolveBuildingRepresentativeTarget(?string $buildingId, string $compoundId): array
    {
        if ($buildingId) {
            $rep = RepresentativeAssignment::query()
                ->active()
                ->where('building_id', $buildingId)
                ->where('role', RepresentativeRole::BuildingRepresentative->value)
                ->first();

            if ($rep?->user_id) {
                return [$rep->user_id, RepresentativeRole::BuildingRepresentative->value];
            }
        }

        return $this->resolvePresidentTarget($compoundId);
    }

    /**
     * @return array{0: int|null, 1: string|null}
     */
    private function resolvePresidentTarget(string $compoundId): array
    {
        $rep = RepresentativeAssignment::query()
            ->active()
            ->where('compound_id', $compoundId)
            ->where('role', RepresentativeRole::President->value)
            ->first();

        if ($rep?->user_id) {
            return [$rep->user_id, RepresentativeRole::President->value];
        }

        return $this->resolveCompoundAdminTarget($compoundId);
    }

    /**
     * @return array{0: int|null, 1: string|null}
     */
    private function resolveCompoundAdminTarget(string $compoundId): array
    {
        /** @var CompoundContextService $compoundContext */
        $compoundContext = app(CompoundContextService::class);

        $admin = User::query()
            ->where('status', 'active')
            ->where(function ($query): void {
                $query->whereIn('role', ['compound_admin', 'compound_head'])
                    ->orWhereHas('roles', fn ($roleQuery) => $roleQuery->whereIn('name', ['compound_admin', 'compound_head']));
            })
            ->get()
            ->first(fn (User $candidate): bool => $compoundContext->userCanAccessCompoundById($candidate, $compoundId));

        return [$admin?->id, $admin ? 'compound_admin' : null];
    }
}
