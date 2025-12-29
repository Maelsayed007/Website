import RestaurantPageContent from '@/components/restaurant-page-content';

const dictionary = {
  restaurant: {
    hero: {
      title: "Amieira Restaurant",
      subtitle: "Experience exquisite dining with a view."
    },
    about: {
      title: "A Culinary Journey",
      description1: "Our restaurant offers a menu inspired by the rich flavors of Portugal, prepared with the freshest local ingredients. Enjoy your meal on our terrace overlooking the magnificent Alqueva lake.",
      description2: "Whether it's a romantic dinner for two or a celebratory meal with family and friends, our team is dedicated to making your experience unforgettable."
    },
    menu: {
      title: "Taste of Alentejo",
      subtitle: "A menu crafted with local ingredients and traditional flavors.",
      notAvailable: "The menu is not available at the moment. Please check back later."
    },
    form: {
      title: "Make a Reservation",
      name: "Full Name",
      namePlaceholder: "Your Name",
      email: "Email",
      emailPlaceholder: "your@email.com",
      phone: "Phone",
      date: "Date",
      datePlaceholder: "Pick a date",
      time: "Time",
      timePlaceholder: "Select a time",
      guests: "Guests",
      guestsPlaceholder: "Select guests",
      guestLabel: "guest",
      guestsLabel: "guests",
      seating: "Seating Preference",
      seatingPlaceholder: "Select preference",
      seatingIndoor: "Indoor",
      seatingOutdoor: "Outdoor",
      seatingAny: "Any",
      submit: "Request Reservation",
      submitting: "Submitting...",
      success: {
        title: "Reservation Submitted",
        description: "We've received your request and will confirm shortly."
      },
      error: {
        title: "Submission Failed",
        description: "Could not submit your reservation. Please try again."
      }
    }
  }
};

export default function RestaurantPage() {
  return <RestaurantPageContent dictionary={dictionary.restaurant} />;
}
