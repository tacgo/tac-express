"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiUploadLine,
  RiCloseLine,
  RiFileTextLine,
} from "@workspace/ui/icons"

export interface FileDropzoneFile {
  file: File
  preview?: string
  id: string
}

interface FileDropzoneProps {
  value?: FileDropzoneFile[]
  onChange?: (files: FileDropzoneFile[]) => void
  accept?: string
  maxFiles?: number
  maxSizeBytes?: number
  disabled?: boolean
  className?: string
  label?: string
  helperText?: string
  multiple?: boolean
  /** Whether to render image previews when accept is image-typed. */
  showPreviews?: boolean
}

function FileDropzone({
  value = [],
  onChange,
  accept = "*",
  maxFiles = 5,
  maxSizeBytes = 5 * 1024 * 1024,
  disabled,
  className,
  label = "Drop files here or click to browse",
  helperText,
  multiple = true,
  showPreviews = true,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const addFiles = React.useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming)
      const valid: FileDropzoneFile[] = []
      let nextError: string | null = null

      for (const file of arr) {
        if (file.size > maxSizeBytes) {
          nextError = `${file.name} exceeds the size limit (${formatBytes(maxSizeBytes)})`
          continue
        }
        if (value.length + valid.length >= maxFiles) {
          nextError = `Cannot upload more than ${maxFiles} files`
          break
        }
        valid.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        })
      }

      setError(nextError)
      if (valid.length > 0) {
        onChange?.([...value, ...valid].slice(0, maxFiles))
      }
    },
    [value, onChange, maxFiles, maxSizeBytes]
  )

  const remove = (id: string) => {
    const target = value.find((f) => f.id === id)
    if (target?.preview) URL.revokeObjectURL(target.preview)
    onChange?.(value.filter((f) => f.id !== id))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    addFiles(e.dataTransfer.files)
  }

  React.useEffect(() => {
    return () => {
      value.forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      data-slot="file-dropzone"
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-dragging={isDragging}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-ring focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-dragging:border-primary data-dragging:bg-primary/5",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <RiUploadLine className="size-6 text-muted-foreground" />
        <span className="font-mono text-ui-11 uppercase tracking-widest text-foreground">
          {label}
        </span>
        <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          {`Up to ${maxFiles} files · max ${formatBytes(maxSizeBytes)} each`}
        </span>
        {helperText && (
          <span className="text-ui-11 text-muted-foreground">
            {helperText}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {error && (
        <span className="font-mono text-ui-10 uppercase tracking-widest text-destructive">
          {error}
        </span>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {value.map((f) => (
            <li
              key={f.id}
              className="group/dropzone-file relative flex flex-col gap-1 border border-border bg-background p-2"
            >
              {showPreviews && f.preview ? (
                // Native <img> is intentional here — `f.preview` is a
                // user-generated blob URL (URL.createObjectURL) for a file
                // the operator just dropped. Next.js Image rejects blob:
                // sources without an unoptimized loader + a remote-pattern
                // entry, and the optimizer would refuse to fetch them
                // anyway. This is a runtime user-content preview, not a
                // static image asset.
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-muted/40">
                  <RiFileTextLine className="size-6 text-muted-foreground" />
                </div>
              )}
              <span className="truncate font-mono text-ui-10 uppercase tracking-wide text-foreground">
                {f.file.name}
              </span>
              <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                {formatBytes(f.file.size)}
              </span>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center border border-border bg-background opacity-0 transition-opacity group-hover/dropzone-file:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove ${f.file.name}`}
              >
                <RiCloseLine className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export { FileDropzone }
