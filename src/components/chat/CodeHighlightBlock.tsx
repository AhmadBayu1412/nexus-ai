'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeHighlightBlockProps {
  language: string;
  codeString: string;
}

export default function CodeHighlightBlock({
  language,
  codeString,
}: CodeHighlightBlockProps) {
  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language || 'text'}
      PreTag="div"
      customStyle={{
        margin: 0,
        padding: '1rem 1.25rem',
        background: 'rgba(1, 4, 9, 0.95)',
        fontSize: '0.8125rem',
        lineHeight: '1.65',
        borderRadius: 0,
      }}
      codeTagProps={{
        style: {
          fontFamily:
            "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
      }}
    >
      {codeString}
    </SyntaxHighlighter>
  );
}
