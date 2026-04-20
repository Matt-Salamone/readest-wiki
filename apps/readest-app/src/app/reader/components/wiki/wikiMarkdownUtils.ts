/** Convert `[[Title]]` into markdown links with `wiki:` scheme for custom rendering. */
export function preprocessWikiBracketLinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]\r\n]+)\]\]/g, (_, inner: string) => {
    const title = inner.trim();
    const encoded = encodeURIComponent(title);
    return `[${title}](wiki:${encoded})`;
  });
}
