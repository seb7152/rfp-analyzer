"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * A generated document (brief, compte rendu) read in the atelier's type:
 * 13 px body, section titles at 15 px, requirement codes as the model wrote
 * them. Nothing decorative.
 */
export function MarkdownDoc({ content, className, large }: { content: string; className?: string; large?: boolean }) {
  return (
    <div className={cn("max-w-[76ch] text-sm leading-[19px]", large && "text-base leading-6", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className={cn("mb-2 mt-4 text-base font-semibold first:mt-0", large && "text-xl")}>{children}</h3>,
          h2: ({ children }) => <h3 className={cn("mb-2 mt-4 text-[15px] font-semibold leading-5 first:mt-0", large && "text-lg")}>{children}</h3>,
          h3: ({ children }) => <h4 className={cn("mb-1.5 mt-3 text-sm font-semibold first:mt-0", large && "text-base")}>{children}</h4>,
          p: ({ children }) => <p className="mb-2.5">{children}</p>,
          ul: ({ children }) => <ul className="mb-2.5 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2.5 list-decimal space-y-1.5 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>,
          code: ({ children }) => <code className="num rounded-sm bg-muted px-1 text-xs">{children}</code>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">{children}</th>,
          td: ({ children }) => <td className="border-b border-border px-2 py-1.5 align-top">{children}</td>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-accent-foreground underline-offset-4 hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
