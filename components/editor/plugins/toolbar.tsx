'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useCallback, useState } from 'react'
import {
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import {
    $createHeadingNode,
    $createQuoteNode,
    HeadingTagType,
} from '@lexical/rich-text'
import { $createListNode, ListNode } from '@lexical/list'
import { Button } from '@/components/ui/button'
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Image as ImageIcon,
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { CodePlugin } from './code'
import { TablePlugin } from './table'
import { createClient } from '@/utils/supabase/client'
import { notifications } from '@/utils/notifications'

export function ToolbarPlugin() {
    const [editor] = useLexicalComposerContext()
    const [isUploading, setIsUploading] = useState(false)

    const formatText = useCallback(
        (format: string) => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
        },
        [editor]
    )

    const formatHeading = useCallback(
        (tag: HeadingTagType) => {
            editor.update(() => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(tag))
                }
            })
        },
        [editor]
    )

    const formatList = useCallback(
        (type: 'bullet' | 'number') => {
            editor.update(() => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createListNode(type))
                }
            })
        },
        [editor]
    )

    const formatQuote = useCallback(() => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createQuoteNode())
            }
        })
    }, [editor])

    const handleImageUpload = async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return

            try {
                setIsUploading(true)
                const supabase = createClient()

                // Upload to Supabase Storage
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const { data, error } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, file)

                if (error) throw error

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName)

                // Insert image into editor
                editor.update(() => {
                    const selection = $getSelection()
                    if ($isRangeSelection(selection)) {
                        selection.insertNodes([
                            $createImageNode({
                                src: publicUrl,
                                altText: file.name,
                            }),
                        ])
                    }
                })
            } catch (error) {
                console.error('Error uploading image:', error)
                notifications.error('Failed to upload image')
            } finally {
                setIsUploading(false)
            }
        }
        input.click()
    }

    return (
        <div className="border-b p-2 flex items-center gap-1 flex-wrap">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => formatText('bold')}
                title="Bold"
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => formatText('italic')}
                title="Italic"
            >
                <Italic className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => formatText('underline')}
                title="Underline"
            >
                <Underline className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => formatText('strikethrough')}
                title="Strikethrough"
            >
                <Strikethrough className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Button
                variant="ghost"
                size="icon"
                onClick={() => formatList('bullet')}
                title="Bullet List"
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => formatList('number')}
                title="Numbered List"
            >
                <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={formatQuote}
                title="Quote"
            >
                <Quote className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <CodePlugin />
            <TablePlugin />

            <Button
                variant="ghost"
                size="icon"
                onClick={handleImageUpload}
                disabled={isUploading}
                title="Insert Image"
            >
                <ImageIcon className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Select onValueChange={(value) => formatHeading(value as HeadingTagType)}>
                <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="h1">Heading 1</SelectItem>
                    <SelectItem value="h2">Heading 2</SelectItem>
                    <SelectItem value="h3">Heading 3</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
} 