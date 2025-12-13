import React from 'react';

/* =========================================================================
   Input reutilizable (estilo Apple)
   ========================================================================= */

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, hint, className = '', containerClassName = '', ...props }, ref) => (
    <div className={`mb-6 ${containerClassName}`}>
      <label className="block text-[13px] font-medium text-zinc-400">{label}</label>
      <input
        ref={ref}
        {...props}
        className={`mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 shadow-inner outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-800/60 ${className}`}
      />
      {error ? (
        <p className="mt-2 text-sm text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
);
InputField.displayName = 'InputField';

/* =========================================================================
   Iconos SVG
   ========================================================================= */

export const IconSpinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

export const IconCheck: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M20 6L9 17l-5-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* =========================================================================
   Toast (Confirmación)
   ========================================================================= */

export const Toast: React.FC<{ show: boolean; children: React.ReactNode }> = ({ show, children }) =>
  show ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
      <div className="flex items-center gap-2 rounded-full bg-zinc-900/95 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-zinc-800/60 backdrop-blur">
        <span className="grid place-items-center rounded-full bg-emerald-500 p-0.5">
          <IconCheck />
        </span>
        {children}
      </div>
    </div>
  ) : null;

/* =========================================================================
   Error Panel
   ========================================================================= */

export const ErrorPanel: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="mx-auto max-w-xl">
    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-rose-200">
      <p className="text-sm font-medium">Error</p>
      <p className="mt-1 text-sm opacity-90">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300/30 px-3 py-1.5 text-sm text-rose-50/90 transition hover:bg-rose-300/10"
        >
          <IconSpinner className="!animate-none opacity-60" /> Reintentar
        </button>
      )}
    </div>
  </div>
);

/* =========================================================================
   Saving Dot (mini feedback/estado)
   ========================================================================= */

export const SavingDot: React.FC = () => (
  <span
    className="relative ml-2 inline-flex h-2.5 w-2.5 rounded-[6px] bg-amber-400/90 shadow-[0_0_8px_1px_rgba(255,200,0,0.3)]"
    aria-hidden
  >
    <span className="absolute inset-0 rounded-[6px] animate-[pulse_1.6s_ease-in-out_infinite] bg-amber-400/40" />
  </span>
);
