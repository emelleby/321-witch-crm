'use client'

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { notifications } from "@/utils/notifications"
import { X } from "lucide-react"

interface FileUploadProps {
    onUploadComplete: (fileIds: string[]) => void
    ticketId?: string
    maxFiles?: number
    allowedTypes?: string[]
    maxSizeInMB?: number
}

export function FileUpload({
    onUploadComplete,
    ticketId,
    maxFiles = 5,
    allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
    maxSizeInMB = 5
}: FileUploadProps) {
    const supabase = createClient()
    const [uploading, setUploading] = useState(false)
    const [files, setFiles] = useState<{ id: string; name: string; url: string }[]>([])

    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > maxSizeInMB * 1024 * 1024) {
            return `File size must be less than ${maxSizeInMB}MB`
        }

        // Check file type
        const fileType = file.type.toLowerCase()
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`

        const isAllowedType = allowedTypes.some(type => {
            if (type.startsWith('.')) {
                // Extension check
                return type.toLowerCase() === fileExtension
            } else if (type.endsWith('/*')) {
                // Mime type group check (e.g., 'image/*')
                const [group] = type.split('/')
                return fileType.startsWith(`${group}/`)
            } else {
                // Exact mime type check
                return type === fileType
            }
        })

        if (!isAllowedType) {
            return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
        }

        return null
    }

    const uploadFiles = useCallback(async (selectedFiles: FileList) => {
        if (files.length + selectedFiles.length > maxFiles) {
            notifications.error(`You can only upload up to ${maxFiles} files`)
            return
        }

        setUploading(true)
        const uploadedFileIds: string[] = []

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i]

                // Validate file
                const validationError = validateFile(file)
                if (validationError) {
                    notifications.error(`${file.name}: ${validationError}`)
                    continue
                }

                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${ticketId ? `tickets/${ticketId}` : 'temp'}/${fileName}`

                // Upload file to storage
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                // Create file record in database
                const { data: fileRecord, error: dbError } = await supabase
                    .from('files')
                    .insert({
                        file_name: file.name,
                        storage_path: filePath,
                        content_type: file.type
                    })
                    .select()
                    .single()

                if (dbError) throw dbError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(filePath)

                setFiles(prev => [...prev, {
                    id: fileRecord.id,
                    name: file.name,
                    url: publicUrl
                }])

                uploadedFileIds.push(fileRecord.id)
            }

            if (uploadedFileIds.length > 0) {
                onUploadComplete(uploadedFileIds)
            }
        } catch (error) {
            console.error('Upload error:', error)
            notifications.error('Failed to upload file')
        } finally {
            setUploading(false)
        }
    }, [files.length, maxFiles, onUploadComplete, supabase, ticketId, validateFile])

    const removeFile = async (fileId: string, index: number) => {
        try {
            const file = files[index]
            await supabase.storage
                .from('attachments')
                .remove([file.url])

            await supabase
                .from('files')
                .delete()
                .eq('id', fileId)

            setFiles(prev => prev.filter((_, i) => i !== index))
            onUploadComplete(files.filter((_, i) => i !== index).map(f => f.id))
        } catch (error) {
            console.error('Remove error:', error)
            notifications.error('Failed to remove file')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading || files.length >= maxFiles}
                >
                    {uploading ? 'Uploading...' : 'Attach Files'}
                </Button>
                <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept={allowedTypes.join(',')}
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) {
                            uploadFiles(e.target.files)
                        }
                    }}
                />
                <span className="text-sm text-muted-foreground">
                    {files.length} / {maxFiles} files
                </span>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, index) => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between p-2 rounded-md border bg-background"
                        >
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm hover:underline"
                            >
                                {file.name}
                            </a>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(file.id, index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
} 