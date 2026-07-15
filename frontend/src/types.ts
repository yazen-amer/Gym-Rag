export interface Source {
  id: number;
  title: string;
  page: number | null;
  snippet: string;
  score: number | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}
