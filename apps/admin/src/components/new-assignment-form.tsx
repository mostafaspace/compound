"use client";

import { useRouter } from "next/navigation";

import { RepresentativeAssignmentForm } from "./representative-assignment-form";
import { createRepresentativeAssignment } from "@/lib/orgchart";
import type { CreateRepresentativeAssignmentInput } from "@/lib/orgchart";

interface NewAssignmentFormProps {
  compoundId: string;
}

export function NewAssignmentForm({ compoundId }: NewAssignmentFormProps) {
  const router = useRouter();

  const handleSubmit = async (data: CreateRepresentativeAssignmentInput) => {
    try {
      await createRepresentativeAssignment(compoundId, data);
      router.push(`/compounds/${compoundId}/representatives`);
    } catch (error) {
      throw error;
    }
  };

  return <RepresentativeAssignmentForm onSubmit={handleSubmit} />;
}
