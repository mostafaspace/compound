import type { UploadFile } from "./types";

type FormDataValue = string | number | boolean | UploadFile | null | undefined;

export function toFormData(body: Record<string, FormDataValue>, fileField = "file"): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (isUploadFile(value)) {
      formData.append(key === "photo" ? "photo" : fileField, value as any);
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}

function isUploadFile(value: FormDataValue): value is UploadFile {
  return typeof value === "object" && value !== null && "uri" in value && "name" in value && "type" in value;
}
