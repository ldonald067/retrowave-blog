import { TextareaHTMLAttributes, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  charCount?: { current: number; max: number };
}

export default function Textarea({
  label,
  error,
  hint,
  charCount,
  id: externalId,
  className = '',
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = externalId || generatedId;

  const isNearLimit = charCount && charCount.current > charCount.max * 0.9;
  const isOverLimit = charCount && charCount.current > charCount.max;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-bold mb-1"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition resize-none focus:outline-none ${className}`}
        style={{
          backgroundColor: 'var(--input-bg, var(--card-bg))',
          borderColor: error ? 'var(--accent-secondary)' : 'var(--input-border, var(--border-primary))',
          color: 'var(--text-body)',
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      <div className="mt-1 flex justify-between items-start">
        <div className="flex-1">
          {error && (
            <p
              id={`${textareaId}-error`}
              className="text-xs font-bold"
              style={{ color: 'var(--accent-secondary)' }}
              role="alert"
            >
              ❌ {error}
            </p>
          )}
          {hint && !error && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {hint}
            </p>
          )}
        </div>
        {charCount && (
          <p
            className="text-xs ml-2 font-bold"
            style={{
              color: isOverLimit
                ? 'var(--accent-secondary)'
                : isNearLimit
                  ? 'var(--accent-primary)'
                  : 'var(--text-muted)',
            }}
          >
            {charCount.current}/{charCount.max}
          </p>
        )}
      </div>
    </div>
  );
}
