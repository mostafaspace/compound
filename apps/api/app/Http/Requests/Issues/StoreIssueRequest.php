<?php

namespace App\Http\Requests\Issues;

use App\Models\Property\Building;
use App\Models\Property\Unit;
use App\Models\RepresentativeAssignment;
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
        });
    }

    /**
     * @return array{compound_id: string, building_id: string|null, assigned_to: int|null}
     */
    public function resolveLocationAndQueue(): array
    {
        /** @var \App\Models\User $user */
        $user = $this->user();
        
        $compoundId = null;
        $buildingId = null;
        $assignedTo = null;

        if ($this->unitId) {
            $unit = Unit::findOrFail($this->unitId);
            $compoundId = $unit->compound_id;
            $buildingId = $unit->building_id;
        } elseif ($this->buildingId) {
            $building = Building::findOrFail($this->buildingId);
            $compoundId = $building->compound_id;
            $buildingId = $building->id;
        }

        // CM-207: Auto-route issue to floor or building representative
        if ($buildingId) {
            $rep = RepresentativeAssignment::where('auditable_type', 'building')
                ->where('auditable_id', $buildingId)
                ->first();
            
            if ($rep && $rep->user_id) {
                $assignedTo = $rep->user_id;
            }
        }

        return [
            'compound_id' => $compoundId,
            'building_id' => $buildingId,
            'assigned_to' => $assignedTo,
        ];
    }
}
