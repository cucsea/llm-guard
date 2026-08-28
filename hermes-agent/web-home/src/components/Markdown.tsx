import { useMemo } from "react";

/**
 * Ultra-light Markdown renderer — no dependencies. Handles the subset that
 * shows up in agent messages: fenced code blocks, inline code, bold, headings,
 * bullet lists, and paragraphs. Everything is escaped first, so it is safe to
 * render the resulting HTML.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(s: string): string {
  let out = escapeHtml(s);
  // inline code
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-[var(--bg)] px-1 py-0.5 font-mono text-[0.85em]">$1</code>',
  );
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="underline" style="color:var(--primary)">$1</a>',
  );
  return out;
}

function toHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (inCode) {
        html.push(
          `<pre class="my-2 overflow-x-auto rounded-md border bg-[var(--bg)] p-3 font-mono text-xs">${escapeHtml(
            codeBuf.join("\n"),
          )}</pre>`,
        );
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const sizes = ["text-lg", "text-base", "text-sm", "text-sm"];
      html.push(
        `<div class="mt-2 mb-1 font-semibold ${sizes[level - 1]}">${renderInline(
          heading[2],
        )}</div>`,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        html.push('<ul class="my-1 list-disc space-y-0.5 pl-5">');
        inList = true;
      }
      html.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    closeList();
    if (line.trim() === "") {
      html.push('<div class="h-2"></div>');
    } else {
      html.push(`<p class="my-0.5">${renderInline(line)}</p>`);
    }
  }
  if (inCode) {
    html.push(
      `<pre class="my-2 overflow-x-auto rounded-md border bg-[var(--bg)] p-3 font-mono text-xs">${escapeHtml(
        codeBuf.join("\n"),
      )}</pre>`,
    );
  }
  closeList();
  return html.join("");
}

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => toHtml(content || ""), [content]);
  return (
    <div
      className="text-sm leading-relaxed [word-break:break-word]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
