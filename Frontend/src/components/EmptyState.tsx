import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  actionHref,
}) => {
  return (
    <div className="py-12 px-4 text-left border border-dashed border-hairline my-4">
      <h3 className="text-base font-semibold text-primary mb-1">{title}</h3>
      <p className="text-sm text-secondary mb-4 max-w-md">{message}</p>
      {actionLabel && actionHref && (
        <Link to={actionHref} className="btn-primary inline-block text-xs py-1.5 px-3">
          {actionLabel}
        </Link>
      )}
    </div>
  );
};
