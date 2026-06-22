import axios from "axios";
import { apiClient } from "./apiClient";

export const fileNameGenerator = (file: File): string => {
  const originalName = file.name
    .split(".")[0]
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-]/g, "")
    .slice(0, 10);
  const ext = file.name.split(".").pop() ?? "csv";
  const timeStr = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(8, 14);
  const randomStr = Math.random().toString(36).substring(2, 5);
  return `${originalName}-${timeStr}${randomStr}.${ext}`;
};

export interface UploadExcelResult {
  file: File;
  signedUrl: string;
  path: string;
}

export const awsLinkGenerateImage = async ({
  file,
  awsFolderPath,
}: {
  file: File;
  awsFolderPath: string;
}): Promise<UploadExcelResult> => {
  const fileNameToStore = fileNameGenerator(file);
  const fullPath = `${awsFolderPath}/${fileNameToStore}`;

  const result = await apiClient("POST", "common", "getsignedputobjecturl", {
    body: {
      file_key: fullPath,
      file_type: file.type,
    },
    shouldUseDefaultToken: false,
  });

  const signedUrl =
    ((result.content?.data as Record<string, string>) ?? {}).signedPutUrl ?? "";

  return { file, signedUrl, path: fullPath };
};

export const awsLinkGenerateExcel = async ({
  file,
  awsFolderPath,
}: {
  file: File;
  awsFolderPath: string;
}): Promise<UploadExcelResult> => {
  const fileNameToStore = fileNameGenerator(file);
  const fullPath = `${awsFolderPath}/${fileNameToStore}`;

  // CSV files on Windows often report file.type as "" — default to text/csv
  const fileType = file.type || "text/csv";

  const result = await apiClient("POST", "common", "getsignedputobjecturl", {
    body: {
      file_key: fullPath,
      file_type: fileType,
      is_private: true,
    },
    shouldUseDefaultToken: false,
  });

  const signedUrl =
    ((result.content?.data as Record<string, string>) ?? {}).signedPutUrl ?? "";

  return { file, signedUrl, path: fullPath };
};

export const gcsFileUpload = async ({
  signedUrl,
  file,
  onProgress,
}: {
  signedUrl: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<void> => {
  await axios.put(signedUrl, file, {
    headers: { "Content-Type": file.type || "text/csv" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
};
