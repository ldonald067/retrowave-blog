import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';

function joinClassNames(...classNames: Array<string | undefined | false>): string {
  return classNames.filter(Boolean).join(' ');
}

type ModalOverlayProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
};

export function ModalOverlay({ children, className, ...props }: ModalOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={joinClassNames(
        'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center p-2 sm:p-4 modal-overlay-safe',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type ModalFrameProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
};

export const ModalFrame = forwardRef<HTMLDivElement, ModalFrameProps>(function ModalFrame(
  { children, className, style, onClick, ...props },
  ref
) {
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 20 }}
      className={joinClassNames(
        'rounded-lg shadow-2xl w-full overflow-hidden modal-panel-safe',
        className
      )}
      style={{
        backgroundColor: 'var(--modal-bg)',
        border: '4px solid var(--modal-border)',
        ...style,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
});

interface ModalHeaderProps {
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ModalHeader({ children, title, subtitle, action, className }: ModalHeaderProps) {
  return (
    <div
      className={joinClassNames('p-3 sm:p-4 border-b-2 border-dotted', className)}
      style={{
        background:
          'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
        borderColor: 'var(--border-primary)',
      }}
    >
      {children ?? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="xanga-title text-lg sm:text-2xl flex items-center gap-2">{title}</h2>
            {action}
          </div>
          {subtitle && <p className="xanga-subtitle mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={joinClassNames('p-3 sm:p-4 border-t-2 border-dotted modal-footer-safe', className)}
      style={{
        background:
          'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
        borderColor: 'var(--border-primary)',
      }}
    >
      {children}
    </div>
  );
}

interface ModalCloseButtonProps {
  onClick: () => void;
  label?: string;
}

export function ModalCloseButton({ onClick, label = 'Close' }: ModalCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center"
      style={{ color: 'var(--text-muted)' }}
      aria-label={label}
    >
      <X size={18} />
    </button>
  );
}
