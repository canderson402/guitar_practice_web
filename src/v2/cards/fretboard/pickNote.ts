import { chromaticPosition } from '../../music/intervals';

/** Where the selection was when an out-of-key note was clicked. */
export interface PickContext { root: string | null; scale: string | null; index: number }
export interface PickedNote extends PickContext { note: string }

/** A clicked note: an in-scale note moves the shared scale position there;
 *  any other note becomes a one-off pick. */
export const pickFromFretboard = (note: string, scaleNotes: string[], ctx: PickContext): { index: number | null; pick: PickedNote | null } => {
  const i = scaleNotes.findIndex(x => chromaticPosition(x) === chromaticPosition(note));
  return i >= 0 ? { index: i, pick: null } : { index: null, pick: { note, ...ctx } };
};

/** The picked note while nothing has moved on since (scale position, key and
 *  scale unchanged); otherwise null. */
export const activePick = (pick: PickedNote | null, ctx: PickContext): string | null =>
  pick && pick.root === ctx.root && pick.scale === ctx.scale && pick.index === ctx.index ? pick.note : null;
