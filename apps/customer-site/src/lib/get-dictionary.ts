
import 'server-only';

// This is a placeholder as we've removed i18n.
// In a real app, you might fetch content from a CMS here.
export const getDictionary = async (locale: string) => {
  return {
    homepage: {
      hero: {
        title: 'Your Houseboat Adventure',
        subtitle: 'Just choose your dates and crew to cast off.',
        licenseFree: 'No License Required To Operate',
      },
      // other keys
    },
    // other sections
  };
};

export type DictionaryWithHouseboat = Awaited<ReturnType<typeof getDictionary>>;
