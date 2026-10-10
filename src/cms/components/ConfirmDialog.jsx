import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="cms-dialog"
      aria-labelledby="cms-dialog-title"
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      onClick={(e) => { if (e.target === ref.current) onCancel(); }}
    >
      <div className="cms-dialog__body">
        <h2 id="cms-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="cms-dialog__actions">
          <button type="button" className="cms-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="cms-btn cms-btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
