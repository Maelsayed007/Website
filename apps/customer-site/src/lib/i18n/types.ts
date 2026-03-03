export type NavigationDictionary = {
  links: {
    home: string;
    houseboats: string;
    riverCruise: string;
    restaurant: string;
    contact: string;
    services: string;
  };
  auth: {
    login: string;
    register: string;
    logout: string;
    dashboard: string;
    myBookings: string;
  };
};

export type FooterDictionary = {
  tagline: string;
  explore: {
    title: string;
    home: string;
    houseboats: string;
    restaurant: string;
    contact: string;
  };
  legal: {
    title: string;
    privacy: string;
    terms: string;
  };
  connect: {
    title: string;
  };
  rightsReserved: string;
};

export type LayoutDictionary = {
  navigation: NavigationDictionary;
  footer: FooterDictionary;
};
