/**
 * Approximate caret position inside a textarea for overlay anchoring (mirror-div style).
 */
export function getTextareaCaretOffset(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; lineHeight: number } {
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'fontFamily',
    'textIndent',
    'textTransform',
    'textAlign',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
    'whiteSpace',
    'wordBreak',
    'wordWrap',
    'lineHeight',
  ] as const;

  const styleRecord = style as unknown as Record<string, string | undefined>;
  const divStyle = div.style as unknown as Record<string, string>;
  for (const prop of properties) {
    divStyle[prop] = styleRecord[prop] ?? '';
  }

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflow = 'hidden';
  div.style.width = `${textarea.clientWidth}px`;

  document.body.appendChild(div);

  const text = textarea.value.slice(0, position);
  const span = document.createElement('span');
  span.textContent = text;
  div.appendChild(span);

  const marker = document.createElement('span');
  marker.textContent = '|';
  div.appendChild(marker);

  const taRect = textarea.getBoundingClientRect();
  const spanRect = marker.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  const scrollLeft = textarea.scrollLeft;
  const scrollTop = textarea.scrollTop;

  const top = spanRect.top - divRect.top - scrollTop + textarea.clientTop;
  const left = spanRect.left - divRect.left - scrollLeft + textarea.clientLeft;

  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize || '16') * 1.2 || 20;

  document.body.removeChild(div);

  return {
    top: taRect.top + top + lineHeight + window.scrollY,
    left: taRect.left + left + window.scrollX,
    lineHeight,
  };
}
