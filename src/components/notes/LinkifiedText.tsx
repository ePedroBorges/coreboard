const urlRegex = /(https?:\/\/(?:(?!https?:\/\/)[^\s])+)/gi;

export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {part}
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
