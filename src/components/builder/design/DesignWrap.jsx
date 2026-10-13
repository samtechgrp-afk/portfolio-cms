import { useMemo } from 'react';
import { designCss, wrapClass } from './css.js';
import { useStatePreview } from './preview.js';

/** Wraps a block that has design settings: emits its CSS next to it and gives it the box those rules style. */
export default function DesignWrap({ id, design, editing, ownsPaint, style, children }) {
  const css = useMemo(() => designCss(id, design, { ownsPaint }), [id, design, ownsPaint]);
  const preview = useStatePreview(id, editing);
  if (!css) return children;
  return (
    <>
      <style>{css}</style>
      <div className={`pbd ${wrapClass(id)}`} data-preview={preview || undefined} data-disabled={design.disabled ? 'true' : undefined} style={style}>{children}</div>
    </>
  );
}
