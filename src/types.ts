export interface Account {
    apiKey: string;
    admin: boolean;
}

export interface TimeEntry {
    account: string;
    id?: number;
    timeId?: number;
    start: Date;
    stop?: Date;
    duration?: number;
    tags: string[];
}

export type JsonTimeEntry = Omit<TimeEntry, 'id'>;
