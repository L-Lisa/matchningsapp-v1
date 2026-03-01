import { cx } from '../../lib/utils.js';

const variants = {
  primary:   'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white',
  secondary: 'bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)]',
  danger:    'bg-[var(--danger)] hover:opacity-90 text-white',
  ghost:     'bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
