import React from 'react';

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

export function Btn({
  variant = 'secondary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const map: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
  };
  return <button className={`btn ${map[variant]} ${className}`} {...props} />;
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
        <div className="flex items-center justify-between px-6 pt-5 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost !px-2 !py-1 text-gray-400"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="shrink-0 px-6 pb-5 pt-2">{footer}</div>}
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
  tone = 'ok',
  children,
  className = '',
}: {
  tone?: 'ok' | 'err' | 'info';
  children: React.ReactNode;
  className?: string;
}) {
  const map = {
    ok: 'bg-green-50 text-green-700',
    err: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${map[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  tone = 'gray',
  children,
}: {
  tone?: 'gray' | 'blue' | 'green' | 'amber' | 'red';
  children: React.ReactNode;
}) {
  const map = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600',
  };
  return <span className={`badge ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, text }: { icon?: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <div className="text-3xl mb-2">{icon || '🍽'}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}

export function StatCard({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'green' }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === 'blue' ? 'bg-blue-50' : 'bg-green-50'}`}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === 'blue' ? 'text-blue-700' : 'text-green-700'}`}>
        {value}
      </div>
    </div>
  );
}