export interface Part {
  text: string;
}

export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}