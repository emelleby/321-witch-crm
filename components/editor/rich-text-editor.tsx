'use client';

import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { $generateNodesFromDOM } from '@lexical/html';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import {
  $convertFromMarkdownString,
  TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TablePlugin as LexicalTablePlugin } from '@lexical/react/LexicalTablePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { LexicalEditor, LexicalNode } from 'lexical';

import { cn } from '@/lib/utils';

import { $createImageNode,ImageNode } from './nodes/image-node';
import { OnChangePlugin } from './plugins/on-change';
import { ToolbarPlugin } from './plugins/toolbar';

const theme = {
  // Theme styling goes here
  paragraph: 'm-0 p-0',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal pl-5 my-2',
    ul: 'list-disc pl-5 my-2',
    listitem: 'my-1',
  },
  heading: {
    h1: 'text-3xl font-bold my-4',
    h2: 'text-2xl font-bold my-3',
    h3: 'text-xl font-bold my-2',
  },
};

const editorConfig = {
  namespace: 'ZendeskCloneEditor',
  theme,
  onError(error: Error) {
    console.error('Editor Error:', error);
  },
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    AutoLinkNode,
    LinkNode,
    ImageNode,
  ],
};

interface RichTextEditorProps {
  onChange?: (html: string) => void;
  initialContent?: string;
  className?: string;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

// Extended markdown transformers
const imageTransformer: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node: LexicalNode) => {
    if (node instanceof ImageNode) {
      return `![${node.__altText}](${node.__src})`;
    }
    return null;
  },
  regExp: /!\[(.*?)\]\((.*?)\)/,
  replace: (textNode, match) => {
    const [, alt, src] = match;
    const imageNode = $createImageNode({ src, altText: alt });
    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};

const EXTENDED_TRANSFORMERS = [...TRANSFORMERS, imageTransformer];

export function RichTextEditor({
  onChange,
  initialContent = '',
  className,
  placeholder = 'Start writing...',
  minHeight = '200px',
  maxHeight = '600px',
}: RichTextEditorProps) {
  const initialConfig = {
    ...editorConfig,
    editorState: (editor: LexicalEditor) => {
      // Try to parse as markdown first
      try {
        return $convertFromMarkdownString(initialContent, EXTENDED_TRANSFORMERS);
      } catch {
        // If markdown parsing fails, try HTML
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialContent, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        return nodes;
      }
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('rounded-md border', className)}>
        <ToolbarPlugin />
        <div
          className="relative"
          style={{
            minHeight,
            maxHeight,
            resize: 'vertical',
            overflow: 'auto',
          }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="px-5 py-[14px] outline-none [&_p]:my-0"
                style={{
                  minHeight: `calc(${minHeight} - 2rem)`,
                  height: '100%',
                  lineHeight: '1.5',
                }}
                aria-required={false}
                role="textbox"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-5 top-[14px] select-none text-muted-foreground">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <LexicalTablePlugin />
          <MarkdownShortcutPlugin transformers={EXTENDED_TRANSFORMERS} />
          <OnChangePlugin onChange={onChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}
