"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
  clamp?: boolean;
}

export function MarkdownContent({ content, className, clamp }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "text-sm text-ash leading-relaxed",
        clamp && "line-clamp-3 overflow-hidden",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-foreground mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium text-foreground mt-2 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-flame-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-ash">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-lava-hot/30 pl-3 my-2 text-ash italic">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-charcoal/50 px-1.5 py-0.5 rounded text-sm font-mono text-flame-400">
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("font-mono text-sm text-ash", codeClassName)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 rounded-md overflow-x-auto bg-charcoal/50 p-4 text-sm">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <table className="w-full my-3 text-sm">{children}</table>
          ),
          th: ({ children }) => (
            <th className="text-left font-mono text-xs text-ash border-b border-lava-hot/20 pb-1 px-2">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-1 px-2 border-b border-charcoal/30 text-ash">{children}</td>
          ),
          hr: () => <hr className="my-4 border-lava-hot/20" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => (
            <del className="line-through text-smoke">{children}</del>
          ),
          img: ({ alt, src }) => (
            <a
              href={src}
              className="text-flame-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {alt || "image"}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
