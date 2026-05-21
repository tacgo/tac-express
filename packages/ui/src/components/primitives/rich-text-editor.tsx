"use client"

import * as React from "react"
import {
  EditorContent,
  useEditor,
  type Editor,
  type Content,
} from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import CharacterCount from "@tiptap/extension-character-count"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"

import { cn } from "@workspace/ui/lib/utils"
import { Toggle } from "@workspace/ui/components/primitives/toggle"
import { Separator } from "@workspace/ui/components/primitives/separator"
import {
  RiBoldLine,
  RiItalicLine,
  RiUnderline,
  RiStrikethrough,
  RiH1,
  RiH2,
  RiH3,
  RiListUnordered,
  RiListOrdered,
  RiDoubleQuotesL,
  RiCodeLine,
  RiLinkM,
  RiAlignLeft,
  RiAlignCenter,
  RiAlignRight,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiTaskLine,
} from "@workspace/ui/icons"

interface RichTextEditorProps {
  value?: Content
  onChange?: (value: { json: object; html: string; text: string }) => void
  placeholder?: string
  editable?: boolean
  characterLimit?: number
  className?: string
  minHeight?: string
  toolbar?: "minimal" | "full" | "none"
  ariaLabel?: string
}

function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing…",
  editable = true,
  characterLimit,
  className,
  minHeight = "10rem",
  toolbar = "full",
  ariaLabel = "Rich text editor",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline underline-offset-4" },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ...(characterLimit
        ? [CharacterCount.configure({ limit: characterLimit })]
        : []),
    ],
    content: value,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.({
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
      })
    },
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class: cn(
          "tiptap prose prose-sm max-w-none px-3 py-2 focus:outline-none",
          "prose-headings:font-heading prose-headings:font-semibold",
          "prose-p:text-xs prose-p:leading-relaxed",
          "prose-a:text-primary prose-a:underline prose-a:underline-offset-4",
          "prose-strong:text-foreground",
          "prose-code:font-mono prose-code:text-paper-11 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5",
          "dark:prose-invert"
        ),
        style: `min-height: ${minHeight};`,
      },
    },
  })

  return (
    <div
      data-slot="rich-text-editor"
      className={cn(
        "flex flex-col border border-input bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className
      )}
    >
      {toolbar !== "none" && editor && (
        <RichTextToolbar editor={editor} variant={toolbar} />
      )}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
      {characterLimit && editor && (
        <div className="flex items-center justify-end border-t border-border px-3 py-1 font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          {editor.storage.characterCount.characters()}/{characterLimit}
        </div>
      )}
    </div>
  )
}

function RichTextToolbar({
  editor,
  variant,
}: {
  editor: Editor
  variant: "minimal" | "full"
}) {
  if (!editor) return null

  return (
    <div
      data-slot="rich-text-toolbar"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1"
    >
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <RiBoldLine />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <RiItalicLine />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <RiUnderline />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <RiStrikethrough />
      </Toggle>

      {variant === "full" && (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 1 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            aria-label="Heading 1"
          >
            <RiH1 />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            aria-label="Heading 2"
          >
            <RiH2 />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 3 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            aria-label="Heading 3"
          >
            <RiH3 />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            aria-label="Bullet list"
          >
            <RiListUnordered />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            aria-label="Ordered list"
          >
            <RiListOrdered />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("taskList")}
            onPressedChange={() =>
              editor.chain().focus().toggleTaskList().run()
            }
            aria-label="Task list"
          >
            <RiTaskLine />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Toggle
            size="sm"
            pressed={editor.isActive("blockquote")}
            onPressedChange={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            aria-label="Quote"
          >
            <RiDoubleQuotesL />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("code")}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            aria-label="Inline code"
          >
            <RiCodeLine />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: "left" })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign("left").run()
            }
            aria-label="Align left"
          >
            <RiAlignLeft />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: "center" })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign("center").run()
            }
            aria-label="Align center"
          >
            <RiAlignCenter />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: "right" })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign("right").run()
            }
            aria-label="Align right"
          >
            <RiAlignRight />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Toggle
            size="sm"
            pressed={editor.isActive("link")}
            onPressedChange={() => {
              const url = window.prompt("URL")
              if (url === null) return
              if (url === "") {
                editor.chain().focus().extendMarkRange("link").unsetLink().run()
                return
              }
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run()
            }}
            aria-label="Link"
          >
            <RiLinkM />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            aria-label="Undo"
          >
            <RiArrowGoBackLine />
          </Toggle>
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            aria-label="Redo"
          >
            <RiArrowGoForwardLine />
          </Toggle>
        </>
      )}
    </div>
  )
}

export { RichTextEditor }
