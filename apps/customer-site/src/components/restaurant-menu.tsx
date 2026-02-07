'use client';
import { Skeleton } from '@/components/ui/skeleton';

type RestaurantMenuProps = {
  menu: MenuCategory[];
  isLoading: boolean;
  dictionary: {
    title: string;
    subtitle: string;
    notAvailable: string;
  };
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
};

type MenuCategory = {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
};

export default function RestaurantMenu({ menu, isLoading, dictionary }: RestaurantMenuProps) {
  if (isLoading) {
    return (
      <div className="space-y-12">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-8 w-1/3 mb-6" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (menu.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{dictionary.notAvailable}</p>
      </div>
    );
  }

  return (
    <section id="menu">
        <div className="text-center mb-12">
            <h2 className="font-headline text-3xl font-bold md:text-4xl">
                {dictionary.title}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                {dictionary.subtitle}
            </p>
        </div>
        <div className="space-y-12">
          {menu.map((category) => (
            <div key={category.id}>
              <h3 className="font-headline text-2xl font-semibold mb-6 text-primary border-b-2 border-primary/20 pb-2">{category.name}</h3>
              <div className="grid gap-6">
                {category.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground max-w-md">{item.description}</p>
                    </div>
                    <p className="font-semibold text-foreground whitespace-nowrap pl-4 pt-1">{item.price}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
    </section>
  );
}
