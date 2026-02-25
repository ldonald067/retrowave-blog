import { InputHTMLAttributes, ReactNode, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  id: externalId,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = externalId || generatedId;

  const iconPadding = icon ? 'pl-10' : '';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold mb-1"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition focus:outline-none min-h-[44px] ${iconPadding} ${className}`}
          style={{
            backgroundColor: 'var(--input-bg, var(--card-bg))',
            borderColor: error ? 'var(--accent-secondary)' : 'var(--input-border, var(--border-primary))',
            color: 'var(--text-body)',
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${inputId}-error`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -3, 3, -2, 1, 0] }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-1 text-xs font-bold"
            style={{ color: 'var(--accent-secondary)' }}
            role="alert"
          >
            ❌ {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
