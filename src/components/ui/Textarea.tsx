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
  const baseStyles =
    'w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition shadow-sm resize-none';
  const errorStyles = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const isNearLimit = charCount && charCount.current > charCount.max * 0.9;
  const isOverLimit = charCount && charCount.current > charCount.max;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`${baseStyles} ${errorStyles} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      <div className="mt-2 flex justify-between items-start">
        <div className="flex-1">
          {error && (
            <p id={`${textareaId}-error`} className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
        {charCount && (
          <p
            className={`text-xs ml-2 ${
              isOverLimit
                ? 'text-red-600 font-semibold'
                : isNearLimit
                  ? 'text-amber-600'
                  : 'text-gray-400'
            }`}
          >
            {charCount.current}/{charCount.max}
          </p>
        )}
      </div>
    </div>
  );
}
