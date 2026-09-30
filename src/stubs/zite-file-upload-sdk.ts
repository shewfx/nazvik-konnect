// Stub for zite-file-upload-sdk — converts file to base64 data URL for storage

export async function uploadFile(_opts: { data: File; filename: string }): Promise<{ fileUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) resolve({ fileUrl: result });
      else reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(_opts.data);
  });
}
