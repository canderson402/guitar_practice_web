import { slugify } from './articles';

// Every theory term the app can link to Learn from. Each concept points at
// an article and (optionally) a section heading inside it. Add a concept
// here once; cards list the concepts they use (registry `concepts`) and the
// card's single "?" (ConceptsMenu) links to them.
export interface Concept { label: string; slug: string; section?: string }

const interval = (label: string, heading: string): Concept =>
  ({ label, slug: 'intervals', section: slugify(heading) });
const mode = (label: string, heading: string): Concept =>
  ({ label, slug: 'scales-and-modes', section: slugify(heading) });

export const CONCEPTS: Record<string, Concept> = {
  'intervals': { label: 'intervals', slug: 'intervals' },
  'scales-and-modes': { label: 'scales and modes', slug: 'scales-and-modes' },
  'root': interval('the root', 'Root'),
  'minor-second': interval('minor second', 'Minor second'),
  'major-second': interval('major second', 'Major second'),
  'minor-third': interval('minor third', 'Minor third'),
  'major-third': interval('major third', 'Major third'),
  'perfect-fourth': interval('perfect fourth', 'Perfect fourth'),
  'tritone': interval('tritone', 'Tritone'),
  'perfect-fifth': interval('perfect fifth', 'Perfect fifth'),
  'minor-sixth': interval('minor sixth', 'Minor sixth'),
  'major-sixth': interval('major sixth', 'Major sixth'),
  'minor-seventh': interval('minor seventh', 'Minor seventh'),
  'major-seventh': interval('major seventh', 'Major seventh'),
  'ionian': mode('the major scale (Ionian)', 'Major (Ionian)'),
  'dorian': mode('the Dorian mode', 'Dorian'),
  'phrygian': mode('the Phrygian mode', 'Phrygian'),
  'lydian': mode('the Lydian mode', 'Lydian'),
  'mixolydian': mode('the Mixolydian mode', 'Mixolydian'),
  'aeolian': mode('the natural minor (Aeolian)', 'Aeolian (natural minor)'),
  'locrian': mode('the Locrian mode', 'Locrian'),
  'harmonic-minor': mode('the harmonic minor', 'Harmonic minor'),
  'major-pentatonic': mode('the major pentatonic', 'Major pentatonic'),
  'minor-pentatonic': mode('the minor pentatonic', 'Minor pentatonic'),
  'tuning': { label: 'tuning', slug: 'tuning', section: 'standard-tuning' },
  'tempo': { label: 'tempo', slug: 'rhythm-basics', section: 'tempo' },
  'time-signature': { label: 'time signatures', slug: 'rhythm-basics', section: 'time-signatures' },
  'subdivision': { label: 'subdivisions', slug: 'rhythm-basics', section: 'subdivisions' },
  'circle-of-fifths': { label: 'the circle of fifths', slug: 'circle-of-fifths', section: 'what-the-circle-of-fifths-is' },
  'all-12-keys': { label: 'practicing in all 12 keys', slug: 'circle-of-fifths', section: 'practicing-in-all-12-keys' },
  'relative-keys': { label: 'relative keys', slug: 'circle-of-fifths', section: 'relative-keys' },
  'triads': { label: 'triads', slug: 'chords-and-triads', section: 'triads' },
  'chords-in-a-key': { label: 'chords in a key', slug: 'chords-and-triads', section: 'chords-in-a-key' },
};

export const getConcept = (id: string): Concept | undefined => CONCEPTS[id];

