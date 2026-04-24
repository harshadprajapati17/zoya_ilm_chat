import React, { type ReactElement, memo, useMemo } from 'react';

interface MessageContentProps {
  content: string;
  className?: string;
  linkClassName?: string;
}

const MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

function parseMarkdown(text: string, linkClassName: string): (string | ReactElement)[] {
  const parts: (string | ReactElement)[] = [];
  let key = 0;
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineParts: (string | ReactElement)[] = [];
    let lastIndex = 0;

    MARKDOWN_RE.lastIndex = 0;
    let match;

    while ((match = MARKDOWN_RE.exec(line)) !== null) {
      if (match.index > lastIndex) {
        lineParts.push(line.substring(lastIndex, match.index));
      }

      if (match[0].startsWith('![')) {
        const altText = match[1] || 'Product Image';
        const imageUrl = match[2];
        lineParts.push(
          <img
            key={key++}
            src={imageUrl}
            alt={altText}
            className="w-40 h-40 object-cover rounded-lg my-2 shadow-md"
            loading="lazy"
          />
        );
      } else if (match[0].startsWith('[')) {
        const linkText = match[3];
        const linkUrl = match[4];
        lineParts.push(
          <a
            key={key++}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {linkText}
          </a>
        );
      } else if (match[0].startsWith('**')) {
        const boldText = match[5];
        lineParts.push(
          <strong key={key++} className="font-semibold">
            {boldText}
          </strong>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      lineParts.push(line.substring(lastIndex));
    }

    if (lineParts.length > 0) {
      parts.push(...lineParts);
    }

    if (lineIndex < lines.length - 1) {
      parts.push(<br key={`br-${key++}`} />);
    }
  });

  return parts.length > 0 ? parts : [text];
}

export default memo(function MessageContent({
  content,
  className = '',
  linkClassName = 'underline hover:opacity-80',
}: MessageContentProps) {
  const rendered = useMemo(
    () => parseMarkdown(content, linkClassName),
    [content, linkClassName],
  );

  return <div className={className}>{rendered}</div>;
});
