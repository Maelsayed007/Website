import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import placeholderData from '@/lib/placeholder-images.json';

const PlaceHolderImages = placeholderData.placeholderImages;

export default function NotFound() {
  const notFoundImage = PlaceHolderImages.find(p => p.id === 'not-found');

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      {notFoundImage && (
        <Image
          src={notFoundImage.imageUrl}
          alt={notFoundImage.description}
          width={400}
          height={300}
          className="max-w-sm rounded-lg"
          data-ai-hint={notFoundImage.imageHint}
        />
      )}
      <h1 className="mt-8 font-headline text-4xl font-bold tracking-tight md:text-6xl">
        404 - Page Not Found
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        It seems you've drifted into uncharted waters. The page you are looking for does not exist.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">Return to Home Port</Link>
      </Button>
    </div>
  );
}
