export interface Account {
  apiKey: string;
  admin: boolean;
}

export interface TimeEntry {
  account: string;
  id: number;
  start: Date;
  stop?: Date;
  duration?: number;
  tags: string[];
}
