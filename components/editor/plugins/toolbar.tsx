"use client";

import { $createListNode, $isListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import {
  Bold,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

import { $createImageNode } from "../nodes/image-node";
import { CodePlugin } from "./code";
import { PreviewPlugin } from "./preview";
import { TablePlugin } from "./table";

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isUploading, setIsUploading] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");
  const { toast } = useToast();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        const element =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElement();

        if (element === null) return;

        if ($isHeadingNode(element)) {
          const tag = element.getTag();
          setBlockType(tag);
        } else if ($isListNode(element)) {
          const parentList = $isListNode(element.getParent())
            ? element.getParent()
            : element;
          const listType = parentList?.getListType();
          setBlockType(listType === "bullet" ? "bullet" : "number");
        } else {
          const type = element.getType();
          if (type === "quote") {
            setBlockType("quote");
          } else {
            setBlockType("paragraph");
          }
        }
      });
    });
  }, [editor]);

  const formatText = useCallback(
    (format: "bold" | "italic" | "underline" | "strikethrough") => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const formatHeading = useCallback(
    (tag: HeadingTagType | "paragraph") => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Clear any existing format before setting new block type
          selection.getNodes().forEach((node) => {
            if ($isHeadingNode(node)) {
              node.remove();
            }
          });

          if (tag === "paragraph") {
            $setBlocksType(selection, () => $createParagraphNode());
          } else {
            $setBlocksType(selection, () => $createHeadingNode(tag));
          }
        }
        setBlockType(tag);
      });
    },
    [editor]
  );

  const formatList = useCallback(
    (type: "bullet" | "number") => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createListNode(type));
        }
      });
    },
    [editor]
  );

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  }, [editor]);

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);
        const supabase = createBrowserSupabaseClient();

        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("attachments")
          .upload(fileName, file);

        if (error) throw error;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("attachments").getPublicUrl(fileName);

        // Insert image into editor
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([
              $createImageNode({
                src: publicUrl,
                altText: file.name,
              }),
            ]);
          }
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: "Upload Error",
          description: "Failed to upload image",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="border-b p-2 flex items-center gap-1 flex-wrap">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => formatText("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => formatText("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => formatText("underline")}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => formatText("strikethrough")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => formatList("bullet")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => formatList("number")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={formatQuote} title="Quote">
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

      <PreviewPlugin />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Select
        value={blockType}
        onValueChange={(value) =>
          formatHeading(value as HeadingTagType | "paragraph")
        }
      >
        <SelectTrigger className="w-[130px] h-8">
          <SelectValue>
            {blockType === "paragraph" && "Paragraph"}
            {blockType === "h1" && "Heading 1"}
            {blockType === "h2" && "Heading 2"}
            {blockType === "h3" && "Heading 3"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
