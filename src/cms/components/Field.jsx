import { useId } from 'react';

/** Label + control + hint + error. `children` is a render function receiving the input props. */
export default function Field({ label, required, hint, error, children, className = '' }) {
  const id = useId();
  const describedBy = [hint && !error && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`cms-field ${className}`}>
      <label htmlFor={id} className="cms-label">
        {label}
        {required && <span className="cms-req"> (required)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {hint && !error && <p id={`${id}-hint`} className="cms-hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="cms-error">{error}</p>}
    </div>
  );
}
