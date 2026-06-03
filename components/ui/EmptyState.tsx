import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON_SIZE: Record<string, string> = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  if (size === 'sm') {
    return (
      <div className={cn('flex items-start gap-3 py-2', className)}>
        <Icon className={cn(ICON_SIZE[size], 'flex-shrink-0 text-text-muted')} aria-hidden="true" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
          {action && (
            <div className="mt-2">
              {action.href ? (
                <Link href={action.href} className="text-xs text-brand-500 hover:underline font-medium">
                  {action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="text-xs text-brand-500 hover:underline font-medium"
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className={cn('mb-4 rounded-2xl bg-surface-muted p-4', size === 'lg' ? 'p-6' : 'p-4')}>
        <Icon className={cn(ICON_SIZE[size], 'text-text-muted')} aria-hidden="true" strokeWidth={1.5} />
      </div>
      <p className={cn('font-medium text-text-primary', size === 'lg' ? 'text-lg' : 'text-base')}>{title}</p>
      <p className="mt-1 max-w-xs text-sm text-text-muted">{description}</p>
        {action && (
          <div className="mt-4">
            {action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center justify-center rounded-md border border-border-app bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors"
              >
                {action.label}
              </Link>
            ) : (
              <Button size="sm" variant="outline" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </div>
        )}
    </div>
  );
}
