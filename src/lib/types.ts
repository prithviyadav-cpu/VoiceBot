export type Role = 'user' | 'assistant';

export type Turn = {
  id: string;
  role: Role;
  text: string;
  /** Epoch ms. Set when the turn is created. */
  at: number;
};

/** Wire format for POST /api/ask. */
export type AskRequest = {
  question: string;
  /** Prior turns, oldest first. The server trims this to a bounded window. */
  history?: Pick<Turn, 'role' | 'text'>[];
};

export type AskErrorBody = {
  error: string;
  /** Present when the caller can usefully retry after a delay. */
  retryAfterMs?: number;
};
