import type { Article } from '../types';
import { majorScale } from './major-scale';
import { intervals } from './intervals';
import { scalesAndModes } from './scales-and-modes';
import { tuning } from './tuning';
import { rhythm } from './rhythm';
import { circleOfFifths } from './circle-of-fifths';
import { chords } from './chords';

export const ARTICLES: Article[] = [majorScale, intervals, scalesAndModes, chords, circleOfFifths, rhythm, tuning];

export const getArticle = (slug: string): Article | undefined => ARTICLES.find(a => a.slug === slug);

export const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
