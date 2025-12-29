import GalleryPageContent from '@/components/gallery-page-content';

const dictionary = {
  gallery: {
    title: "Our Gallery",
    subtitle: "A glimpse into the Amieira Getaways experience.",
    categories: {
      all: "All",
      houseboat: "Houseboats",
      restaurant: "Restaurant",
      scenery: "Scenery"
    }
  }
};

export default function GalleryPage() {
  return <GalleryPageContent dictionary={dictionary.gallery} />;
}
