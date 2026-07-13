import { ExternalLink } from "lucide-react";

const urlRegex = /(https:\/\/(:(!https:\/\/)[^\s])+)/gi;

const formatUrlLabel = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return host || url.slice(0, 42);
  } catch {
    return url.length > 42 `${url.slice(0, 39)}...` : url;
  }
};

export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (/^https:\/\//i.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              title={part}
              className="mx-0.5 my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 align-middle text-sm font-medium text-primary transition-colors hover:border-primary/45 hover:bg-primary/15"
            >
              <span className="min-w-0 truncate">{formatUrlLabel(part)}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          );
        }
        return (
          <span key={`${part}-${index}`}>
            {part.split("\n").map((line, lineIndex, lines) => (
              <span key={`${line}-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}
