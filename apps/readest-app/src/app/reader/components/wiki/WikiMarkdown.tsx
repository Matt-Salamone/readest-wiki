'use client';

import clsx from 'clsx';
import React, { useMemo } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { WikiPage } from '@/types/wiki';
import { preprocessWikiBracketLinks } from './wikiMarkdownUtils';
import { wikiTitleToSlug } from '@/services/wiki';

export interface WikiMarkdownProps {
  markdown: string;
  pagesBySlug: Map<string, WikiPage>;
  onWikiPageNavigate: (pageId: string) => void;
  className?: string;
}

const WikiMarkdown: React.FC<WikiMarkdownProps> = ({
  markdown,
  pagesBySlug,
  onWikiPageNavigate,
  className,
}) => {
  const processed = useMemo(() => preprocessWikiBracketLinks(markdown || ''), [markdown]);

  return (
    <div className={clsx('wiki-md prose prose-sm max-w-none', className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (url.startsWith('wiki:') ? url : defaultUrlTransform(url))}
        components={{
          a: ({ href, children, className, ...props }) => {
            if (href?.startsWith('wiki:')) {
              const raw = decodeURIComponent(href.slice('wiki:'.length));
              const slug = wikiTitleToSlug(raw);
              const target = pagesBySlug.get(slug);
              if (!target) {
                return <span className={clsx('text-base-content/40', className)}>{children}</span>;
              }
              const isGhost = target.isGhost === 1;
              return (
                <button
                  type='button'
                  className={clsx(
                    'link link-hover inline bg-transparent p-0 text-left font-medium underline',
                    isGhost ? 'text-base-content/50' : 'text-primary',
                    className,
                  )}
                  onClick={() => {
                    onWikiPageNavigate(target.id);
                  }}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} className={className} {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {processed || ' '}
      </Markdown>
    </div>
  );
};

export default WikiMarkdown;
