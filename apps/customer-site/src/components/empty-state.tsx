import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description max-w-sm">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
