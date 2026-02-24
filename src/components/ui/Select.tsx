import { SelectHTMLAttributes, useId } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export default function Select({
  label,
  error,
  options,
  placeholder,
  id: externalId,
  className = '',
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = externalId || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold mb-1"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition cursor-pointer focus:outline-none appearance-none ${className}`}
        style={{
          backgroundColor: 'var(--input-bg, var(--card-bg))',
          borderColor: error
            ? 'var(--accent-secondary)'
            : 'var(--input-border, var(--border-primary))',
          color: 'var(--text-body)',
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p
          id={`${selectId}-error`}
          className="mt-1 text-xs"
          role="alert"
          style={{ color: 'var(--accent-secondary)' }}
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
