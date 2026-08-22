'use client';

import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);

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
