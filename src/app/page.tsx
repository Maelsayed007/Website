import HomePageContent from '@/components/homepage-content';

// English dictionary data is now hardcoded
const dictionary = {
  homepage: {
    hero: {
      title: "Your Houseboat Adventure",
      subtitle: "Just choose your dates and crew to cast off.",
      licenseFree: "No License Required To Operate",
    },
    testimonials: {
      none: "No testimonials available yet.",
    },
  },
  restaurant: {
    form: {
      title: "Make a Reservation",
    },
  },
  houseboat: {
    features: {
      guests: "Guests",
      bedrooms: "Bedrooms",
    },
  },
};

export default function HomePage() {
  return <HomePageContent dictionary={dictionary} />;
}
