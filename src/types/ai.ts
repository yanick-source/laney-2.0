export interface AIAnalysis {
  title: string;
  subtitle?: string;
  summary: string;
  mood: string;
  colorPalette: string[];
  chapters: AIChapter[];
  suggestedPages: number;
  photoCount: number;
}

export interface AIChapter {
  title: string;
  description: string;
  mood?: string;
}

export interface PhotoMetadata {
  people: string[];
  places: string[];
  events: string[];
  mood: string;
  quality: number;
  isLandscape: boolean;
  isPortrait: boolean;
  aspectRatio: number;
}
