import { createContext, useContext, useLayoutEffect, useRef } from 'react';

/**
 * Inline editing on the canvas. The editor provides { patch(blockId, patch) }; the public site never does,
 * so on the site <Editable> is just plain text and nothing can be edited.
 */
export const InlineEditContext = createContext(null);
export const useInlineEdit = () => useContext(InlineEditContext);

/** Asks the property panel to open and focus a field (for example "avatar"). Survives the panel mounting after the click. */
let pendingField = null;
export function requestField(key) {
  pendingField = key;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pb:focus-field', { detail: { key } }));
}
export function takePendingField() {
  const k = pendingField; pendingField = null; return k;
}

/**
 * Text you can click and type into on the canvas. Saves when you leave it (blur). Enter finishes a one-line field.
 * `maxLength` stops typing and pasting beyond the limit. Pasted text is always plain.
 */
export function Editable({ blockId, field, value, tag: Tag = 'span', className = '', multiline = false, maxLength, placeholder, label, editing }) {
  const ctx = useInlineEdit();
  const ref = useRef(null);
  const live = !!(editing && ctx?.patch && blockId);

  // Keep the box in step with outside changes (the property panel) without moving the caret while you type.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!live || !el || document.activeElement === el) return;
    if (el.textContent !== (value ?? '')) el.textContent = value ?? '';
  });

  if (!live) return <Tag className={className}>{value}</Tag>;

  const commit = (el) => {
    let text = el.textContent.replace(/ /g, ' ');
    if (!multiline) text = text.replace(/\s*\n+\s*/g, ' ');
    text = text.trim();
    if (maxLength) text = text.slice(0, maxLength);
    if (text !== (value ?? '')) ctx.patch(blockId, { [field]: text });
    else if (el.textContent !== text) el.textContent = text;
  };
  return (
    <Tag
      ref={ref} className={`${className} pb-editable`} data-inline="true" data-placeholder={placeholder}
      contentEditable suppressContentEditableWarning spellCheck role="textbox" aria-multiline={multiline || undefined} aria-label={label}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.currentTarget.textContent = value ?? ''; e.currentTarget.blur(); }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const room = maxLength ? Math.max(0, maxLength - e.currentTarget.textContent.length) : Infinity;
        const t = e.clipboardData.getData('text/plain').slice(0, room);
        document.execCommand('insertText', false, multiline ? t : t.replace(/\s*\n+\s*/g, ' '));
      }}
      onBeforeInput={(e) => {
        if (!maxLength || !e.data) return;
        const sel = window.getSelection();
        const selected = sel && ref.current.contains(sel.anchorNode) ? sel.toString().length : 0;
        const room = maxLength - (ref.current.textContent.length - selected);
        if (e.data.length > room) {
          // Too long: keep what fits instead of dropping the whole insertion.
          e.preventDefault();
          if (room > 0) document.execCommand('insertText', false, e.data.slice(0, room));
        }
      }}
      onBlur={(e) => commit(e.currentTarget)}
    />
  );
}
