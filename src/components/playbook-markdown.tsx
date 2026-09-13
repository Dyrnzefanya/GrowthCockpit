import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/domain/playbook";
import { cn } from "@/lib/utils";

function text(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number")
    return String(children);
  if (Array.isArray(children)) return children.map(text).join("");
  if (children && typeof children === "object" && "props" in children)
    return text(
      (children as { props: { children?: ReactNode } }).props.children,
    );
  return "";
}

export function PlaybookMarkdown({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "playbook-prose min-w-0 max-w-prose break-words text-sm",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => (
            <h2 id={slugify(text(children))}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={slugify(text(children))}>{children}</h3>
          ),
          table: ({ children }) => (
            <div className="table-scroll my-5">
              <table>{children}</table>
            </div>
          ),
          input: (props) => <input {...props} aria-label="Checklist item" />,
          a: ({ href, children }) => (
            <a href={href} rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
