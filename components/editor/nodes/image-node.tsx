"use client";

import { DecoratorNode } from "lexical";
import Image from "next/image";
import * as React from "react";

import { cn } from "@/lib/utils";

export class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string;
  __altText: string;
  __width: number | undefined;
  __height: number | undefined;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    );
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    key?: string
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "relative my-4";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React.ReactElement {
    const { __src, __altText, __width, __height } = this;
    const isEditable = true;
    const isSelected = false;
    const width = __width;
    const height = __height;

    return (
      <div className="relative my-4">
        {isEditable ? (
          <div className="relative">
            <Image
              src={__src}
              alt={__altText || ""}
              width={width || 800}
              height={height || 600}
              className={cn(
                "rounded-lg border bg-muted",
                isSelected && "ring-2 ring-ring ring-offset-2"
              )}
              style={{
                width: width || "auto",
                height: height || "auto",
              }}
            />
            {isSelected && (
              <div className="absolute inset-0 ring-2 ring-ring ring-offset-2" />
            )}
          </div>
        ) : (
          <Image
            src={__src}
            alt={__altText || ""}
            width={width || 800}
            height={height || 600}
            className="rounded-lg border bg-muted"
            style={{
              width: width || "auto",
              height: height || "auto",
            }}
          />
        )}
      </div>
    );
  }
}

export function $createImageNode({
  src,
  altText,
  width,
  height,
}: {
  src: string;
  altText: string;
  width?: number;
  height?: number;
}): ImageNode {
  return new ImageNode(src, altText, width, height);
}
