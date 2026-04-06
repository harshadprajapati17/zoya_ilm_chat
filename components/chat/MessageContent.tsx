import React, { type ReactElement } from 'react';

interface MessageContentProps {
  content: string;
  className?: string;
  linkClassName?: string;
}

export default function MessageContent({
  content,
  className = '',
  linkClassName = 'underline hover:opacity-80',
}: MessageContentProps) {
  // Parse markdown-style content (images, links, bold text)
  const renderContent = (text: string) => {
    const parts: (string | ReactElement)[] = [];
    let currentText = text;
    let key = 0;

    // Split by newlines to preserve line breaks
    const lines = currentText.split('\n');

    lines.forEach((line, lineIndex) => {
      const lineParts: (string | ReactElement)[] = [];
      let lastIndex = 0;

      // Combined regex to match images, links, and bold text
      // Images: ![alt](url)
      // Links: [text](url)
      // Bold: **text**
      const combinedRegex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
      let match;

      while ((match = combinedRegex.exec(line)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          lineParts.push(line.substring(lastIndex, match.index));
        }

        if (match[0].startsWith('![')) {
          // It's an image: ![alt](url)
          const altText = match[1] || 'Product Image';
          const imageUrl = match[2];
          lineParts.push(
            <img
              key={key++}
              src={imageUrl}
              alt={altText}
              className="max-w-xs md:max-w-sm rounded-lg my-2 shadow-md"
              loading="lazy"
            />
          );
        } else if (match[0].startsWith('[')) {
          // It's a link: [text](url)
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
          // It's bold text: **text**
          const boldText = match[5];
          lineParts.push(
            <strong key={key++} className="font-semibold">
              {boldText}
            </strong>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text after the last match
      if (lastIndex < line.length) {
        lineParts.push(line.substring(lastIndex));
      }

      // Add the line parts
      if (lineParts.length > 0) {
        parts.push(...lineParts);
      }

      // Add line break if not the last line
      if (lineIndex < lines.length - 1) {
        parts.push(<br key={`br-${key++}`} />);
      }
    });

    return parts.length > 0 ? parts : text;
  };

  return <div className={className}>{renderContent(content)}</div>;
}
