import 'server-only';

const dictionaries = {
    en: () => import('@/dictionaries/en.json').then((module) => module.default),
    pt: () => import('@/dictionaries/pt.json').then((module) => module.default),
    de: () => import('@/dictionaries/de.json').then((module) => module.default),
    es: () => import('@/dictionaries/es.json').then((module) => module.default),
    fr: () => import('@/dictionaries/fr.json').then((module) => module.default),
    it: () => import('@/dictionaries/it.json').then((module) => module.default),
    nl: () => import('@/dictionaries/nl.json').then((module) => module.default),
};

const navigationDictionaries = {
    en: () => import('@/dictionaries/navigation/en.json').then((module) => module.default),
    pt: () => import('@/dictionaries/navigation/pt.json').then((module) => module.default),
    de: () => import('@/dictionaries/navigation/de.json').then((module) => module.default),
    es: () => import('@/dictionaries/navigation/es.json').then((module) => module.default),
    fr: () => import('@/dictionaries/navigation/fr.json').then((module) => module.default),
    it: () => import('@/dictionaries/navigation/it.json').then((module) => module.default),
    nl: () => import('@/dictionaries/navigation/nl.json').then((module) => module.default),
};

const footerDictionaries = {
    en: () => import('@/dictionaries/footer/en.json').then((module) => module.default),
    pt: () => import('@/dictionaries/footer/pt.json').then((module) => module.default),
    de: () => import('@/dictionaries/footer/de.json').then((module) => module.default),
    es: () => import('@/dictionaries/footer/es.json').then((module) => module.default),
    fr: () => import('@/dictionaries/footer/fr.json').then((module) => module.default),
    it: () => import('@/dictionaries/footer/it.json').then((module) => module.default),
    nl: () => import('@/dictionaries/footer/nl.json').then((module) => module.default),
};

export type SupportedLocale = keyof typeof dictionaries;

function resolveLocale(locale: string): SupportedLocale {
    return (locale in dictionaries ? locale : 'en') as SupportedLocale;
}

export const getDictionary = async (locale: string) => {
    return dictionaries[resolveLocale(locale)]();
};

export const getNavigationDictionary = async (locale: string) => {
    return navigationDictionaries[resolveLocale(locale)]();
};

export const getFooterDictionary = async (locale: string) => {
    return footerDictionaries[resolveLocale(locale)]();
};
