export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; tone: 'tip' | 'note'; text: string }
  | { type: 'example'; kind: 'scale'; root: string; scale: string; caption?: string }
  | { type: 'tryIt'; label: string; set: { key?: string; scale?: string; bpm?: number }; workspaceId: string };

export interface Article {
  slug: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  /** Placeholder article: shown with a "coming soon" note. */
  draft?: boolean;
  blocks: Block[];
}
