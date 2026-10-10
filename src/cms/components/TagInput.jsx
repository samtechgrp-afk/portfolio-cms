import { useState } from 'react';

export default function TagInput({ id, value, onChange, suggestions = [], ...aria }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const tag = raw.trim().replace(/,$/, '').trim();
    if (!tag) return;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft('');
  };
  const remove = (tag) => onChange(value.filter((v) => v !== tag));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
    else if (e.key === 'Backspace' && !draft && value.length) remove(value[value.length - 1]);
  };

  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="cms-tags">
        {value.map((tag) => (
          <span key={tag} className="cms-chip">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          id={id}
          className="cms-tags__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : 'Type a category and press Enter'}
          {...aria}
        />
      </div>
      {unused.length > 0 && (
        <div className="cms-suggest" aria-label="Existing categories">
          {unused.slice(0, 8).map((s) => (
            <button type="button" key={s} className="cms-chip cms-chip--ghost" onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
