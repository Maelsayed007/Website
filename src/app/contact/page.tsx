import ContactPageContent from '@/components/contact-page-content';

const dictionary = {
  contact: {
    title: "Get in Touch",
    subtitle: "We'd love to hear from you! Whether you have a question about our services, a booking inquiry, or just want to say hello, feel free to reach out.",
    form: {
      title: "Send us a Message",
      name: "Name",
      namePlaceholder: "Your Name",
      email: "Email",
      emailPlaceholder: "your@email.com",
      message: "Message",
      messagePlaceholder: "Your message...",
      submit: "Send Message",
      submitting: "Sending...",
      success: { title: "Message Sent!", description: "Thank you for reaching out. We'll get back to you shortly." },
      error: { title: "Submission Error", description: "Could not send your message. Please try again." },
      validation: { title: "Missing Information", description: "Please fill out all fields before sending." }
    },
    info: {
      title: "Contact Information"
    },
    location: {
      title: "Our Location"
    }
  }
};

export default function ContactPage() {
  return <ContactPageContent dictionary={dictionary.contact} />;
}
