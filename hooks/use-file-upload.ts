import { useState } from "react";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { Database } from "@/database.types";

interface FileUploadOptions {
  bucketName?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

// Define supported file types based on Unstructured API
const SUPPORTED_FILE_TYPES = {
  // Plaintext
  ".txt": "text/plain",
  ".eml": "message/rfc822",
  ".msg": "application/vnd.ms-outlook",
  ".xml": "application/xml",
  ".html": "text/html",
  ".md": "text/markdown",
  ".rst": "text/x-rst",
  ".json": "application/json",
  ".rtf": "application/rtf",
  // Images
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  // Documents
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pdf": "application/pdf",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".epub": "application/epub+zip",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Zipped
  ".gz": "application/gzip",
};

export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    bucketName = "attachments",
    maxSizeMB = 100, // Unstructured API limit
    allowedTypes = Object.values(SUPPORTED_FILE_TYPES),
  } = options;

  const [uploading, setUploading] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }

      // Validate file type
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const isAllowedType = Object.entries(SUPPORTED_FILE_TYPES).some(
        ([ext, mimeType]) =>
          (fileExt === ext.toLowerCase() && file.type === mimeType) ||
          file.type === mimeType
      );

      if (!isAllowedType) {
        throw new Error(
          `File type not allowed. Supported types: ${Object.keys(
            SUPPORTED_FILE_TYPES
          ).join(", ")}`
        );
      }

      // Create a unique file path
      const filePath = `${crypto.randomUUID()}${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { data: fileRecord, error: dbError } = await supabase
        .from("uploaded_files")
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Start background processing for supported document types
      const isProcessableDocument = [
        "text/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument",
        "application/vnd.oasis.opendocument",
        "application/epub+zip",
        "text/csv",
        "text/tab-separated-values",
      ].some((type) => file.type.startsWith(type));

      if (isProcessableDocument) {
        await supabase.functions.invoke("process-document", {
          body: { fileId: fileRecord.file_id },
        });
      }

      return fileRecord;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      // Get file record
      const { data: file } = await supabase
        .from("uploaded_files")
        .select("storage_path")
        .eq("file_id", fileId)
        .single();

      if (!file) throw new Error("File not found");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from("uploaded_files")
        .delete()
        .eq("file_id", fileId);

      if (dbError) throw dbError;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
  };
}
