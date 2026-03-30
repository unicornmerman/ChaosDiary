import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface RawSignal {
  intensity_series: number[];
  emotion_hex: string;
  anchor_word: string;
  duration_ms: number;
}

export interface DreamEntry {
  id: string;
  content: string;
  metadata: {
    date: string;
    anchor: string;
    intensity_peak: number;
  };
}

export function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split("\n");
  const data: any = {};
  lines.forEach(line => {
    const [key, ...val] = line.split(": ");
    data[key.trim()] = val.join(": ").trim();
  });
  return data;
}
