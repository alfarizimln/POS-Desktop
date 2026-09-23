import React from 'react';
import foodIcon from '../assets/food.png';

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type BtnSize = 'sm' | 'md' | 'lg';

export function Btn({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  const map: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
  };
  const sizeMap: Record<BtnSize, string> = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };
  return <button className={`btn ${map[variant]} ${sizeMap[size]} ${className}`} {...props} />;
}

export function LogoMark({ size = 32, rounded = 'rounded-lg' }: { size?: number; rounded?: string }) {
  return (
    <img
      src={foodIcon}
      alt="E-Restoran"
      className={`shrink-0 object-cover ${rounded}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

export function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex rounded-md border border-gray-300 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-9 text-sm font-medium transition-colors ${
            value === o.value ? 'bg-accent text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}) {
  const sizes = { sm: 'w-[440px]', md: 'w-[560px]', lg: 'w-[760px]', xl: 'w-[900px]' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`modal-card max-h-[92vh] ${sizes[size]} max-w-full`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 px-5 pb-5 pt-1">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Alert({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: 'ok' | 'err' | 'info';
  children: React.ReactNode;
  className?: string;
}) {
  const map = {
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    err: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`px-3.5 py-2 rounded-md text-sm font-medium border ${map[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  tone = 'gray',
  children,
}: {
  tone?: 'gray' | 'teal' | 'green' | 'amber' | 'red';
  children: React.ReactNode;
}) {
  const map = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    teal: 'bg-accent-tint text-accent border-accent-soft',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return <span className={`badge border ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <svg
        className="w-8 h-8 mb-2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M5 19 19 5" />
      </svg>
      <div className="text-sm">{text}</div>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}