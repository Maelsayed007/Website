
import type { LucideProps } from 'lucide-react';

type AmenityItem = {
  icon: React.ComponentType<LucideProps>;
  label: string;
};

type AmenityGroupProps = {
  title: string;
  items: AmenityItem[];
};

export default function AmenityGroup({ title, items }: AmenityGroupProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
        <h4 className="font-semibold text-xl mb-4">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                    <item.icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-base text-foreground">{item.label}</span>
                </div>
            ))}
        </div>
    </div>
  );
}
