import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
  displayClassName?: string;
  placeholder?: string;
}

export function InlineEdit({ value, onSave, type = 'text', className, displayClassName, placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className={clsx(
          'hover:text-fuega-orange transition-colors cursor-pointer text-left',
          displayClassName
        )}
        title="Click to edit"
      >
        {value || <span className="text-fuega-text-muted italic">{placeholder || 'Click to edit'}</span>}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
      }}
      aria-label="Edit value"
      className={clsx(
        'bg-fuega-input border border-fuega-orange/50 rounded px-2 py-0.5 text-fuega-text-primary focus:outline-none',
        className
      )}
    />
  );
}
