import createIconSet from '@expo/vector-icons/createIconSet';

import { featherGlyphMap } from '../../assets/fonts/feather-glyphs';

// Feather.ttf is vendored locally (packages/ui/src/assets/fonts) instead of
// imported from @expo/vector-icons' own vendor directory, so the font ships
// as a first-party asset rather than one nested inside a pnpm-store
// node_modules path — see .dockerignore for why that distinction matters.
const featherFont = require('../../assets/fonts/Feather.ttf');

export const Icon = createIconSet(featherGlyphMap, 'Feather', featherFont);
