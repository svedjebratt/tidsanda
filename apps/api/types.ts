export interface Account {
  apiKey: string;
  admin: boolean;
}

export interface TimeEntry {
  account: string;
  id: number;
  start: number;
  stop?: number;
  tags: string[];
  duration?: number;
}

export interface PomodoroState {
  status: 'running';
  startedAt: number;
  durationMs: number;
  endsAt: number;
  updatedAt: number;
}

export interface APIResponse {
  statusCode: number;
  body: string;
  headers: {
    'Content-Type': string;
  };
}

export interface APIEvent {
  routeKey: string;
  headers: {
    authorization?: string;
  };
  body?: string;
  pathParameters?: {
    [key: string]: string;
  };
  queryStringParameters?: {
    [key: string]: string;
  };
  requestContext: {
    http: {
      method: string;
      path: string;
    };
  };
}
