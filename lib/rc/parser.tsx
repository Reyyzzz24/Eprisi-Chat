import { parser } from "@rocket.chat/message-parser";
import type { ReactNode } from "react";

// Node shapes below are taken verbatim from spike/16-RESULT.md (GATE 1,
// spike #16) — real AST output from `@rocket.chat/message-parser`, not
// guessed from documentation. Add a case here only after confirming the
// node's actual shape the same way.
//
// Per spike #16's bonus finding: `chat.sendMessage`/`channels.history`
// responses already include a pre-parsed `md` field with this exact AST
// shape — prefer that over re-parsing `msg.msg` client-side wherever it's
// present (avoids double-parsing REST-sourced history).

type Node = { type: string; [key: string]: unknown };

function renderChildren(nodes: Node[] | Node | undefined, keyPrefix: string): ReactNode {
  if (!nodes) return null;
  const arr = Array.isArray(nodes) ? nodes : [nodes];
  return arr.map((node, i) => <span key={`${keyPrefix}-${i}`}>{renderNode(node, `${keyPrefix}-${i}`)}</span>);
}

function renderNode(node: Node, key: string): ReactNode {
  switch (node.type) {
    case "PARAGRAPH":
      return <p className="whitespace-pre-wrap break-words leading-relaxed">{renderChildren(node.value as Node[], key)}</p>;
    case "PLAIN_TEXT":
      return node.value as string;
    case "BOLD":
      return <strong className="font-semibold">{renderChildren(node.value as Node[], key)}</strong>;
    case "ITALIC":
      return <em>{renderChildren(node.value as Node[], key)}</em>;
    case "STRIKE":
      return <s className="opacity-70">{renderChildren(node.value as Node[], key)}</s>;
    case "INLINE_CODE":
      return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {renderNode(node.value as Node, `${key}-code`)}
        </code>
      );
    case "CODE": {
      const lines = node.value as Node[];
      return (
        <pre className="my-1 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.85em]">
          <code>
            {lines.map((line, i) => (
              <div key={`${key}-line-${i}`}>{renderNode((line as Node & { value: Node }).value, `${key}-line-${i}`)}</div>
            ))}
          </code>
        </pre>
      );
    }
    case "LINK": {
      const value = node.value as { src: Node; label: Node[] };
      const href = (value.src as Node & { value: string }).value;
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2">
          {renderChildren(value.label, `${key}-label`)}
        </a>
      );
    }
    case "MENTION_USER": {
      const value = node.value as Node & { value: string };
      return <span className="rounded bg-primary/10 px-1 font-medium text-primary">@{value.value}</span>;
    }
    case "MENTION_CHANNEL": {
      const value = node.value as Node & { value: string };
      return <span className="rounded bg-primary/10 px-1 font-medium text-primary">#{value.value}</span>;
    }
    case "EMOJI": {
      const shortCode = node.shortCode as string;
      return <span title={`:${shortCode}:`}>:{shortCode}:</span>;
    }
    case "QUOTE":
      return (
        <blockquote className="border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground">
          {renderChildren(node.value as Node[], key)}
        </blockquote>
      );
    case "UNORDERED_LIST":
      return <ul className="list-disc pl-5">{renderChildren(node.value as Node[], key)}</ul>;
    case "ORDERED_LIST":
      return <ol className="list-decimal pl-5">{renderChildren(node.value as Node[], key)}</ol>;
    case "LIST_ITEM":
      return <li>{renderChildren(node.value as Node[], key)}</li>;
    default:
      // Unknown node type — degrade to plain text of any nested value
      // rather than throwing, so one unsupported markdown feature doesn't
      // blank out an entire message.
      return typeof node.value === "string" ? node.value : renderChildren(node.value as Node[], key);
  }
}

export function MessageBody({ text, ast }: { text: string; ast?: unknown }): ReactNode {
  let nodes: Node[];
  try {
    nodes = (ast as Node[] | undefined) ?? (parser(text) as unknown as Node[]);
  } catch {
    return <p className="whitespace-pre-wrap break-words">{text}</p>;
  }
  return <>{nodes.map((node, i) => <span key={`root-${i}`}>{renderNode(node, `root-${i}`)}</span>)}</>;
}
