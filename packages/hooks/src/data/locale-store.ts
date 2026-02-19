import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';

export type LocaleState = {
  id: 'current';
  locale: string;
};

const initialLocale: LocaleState = {
  id: 'current',
  locale: 'en',
};

export const localeCollection = createCollection(
  localOnlyCollectionOptions({
    id: 'locale',
    getKey: (item: LocaleState) => item.id,
    initialData: [initialLocale],
  })
);

export function setLocaleState(locale: string) {
  localeCollection.update('current', (draft) => {
    draft.locale = locale;
  });
}
