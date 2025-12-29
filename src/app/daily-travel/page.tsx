import DailyTravelPageContent from '@/components/daily-travel-page-content';

const dictionary = {
  dailyTravel: {
    title: "Daily Excursions",
    subtitle: "Discover the beauty of Alqueva with our guided boat tours. Perfect for a day of adventure and relaxation.",
    duration: "Duration",
    hours: "hours",
    minimum: "Minimum",
    people: "people",
    from: "From",
    exclusive: "exclusive",
    perAdult: "per adult",
    requestBooking: "Request Booking",
    noExcursions: {
      title: "No Excursions Available",
      description: "Please check back later or contact us for private tour options."
    },
    submissionFailed: {
      title: "Submission Failed",
      description: "Could not submit your request. Please contact us directly."
    },
    dialog: {
      title: "Request to Book",
      description: "Please provide your details. We will contact you to confirm the date and payment.",
      form: {
        name: "Full Name",
        namePlaceholder: "Your Name",
        email: "Email",
        emailPlaceholder: "your@email.com",
        phone: "Phone",
        guests: "Number of Guests",
        cancel: "Cancel",
        submit: "Submit Request",
        submitting: "Submitting..."
      }
    }
  }
};

export default function DailyTravelPage() {
  return <DailyTravelPageContent dictionary={dictionary} />;
}
