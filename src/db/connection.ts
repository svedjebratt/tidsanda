import { Client } from 'pg';

export async function connection() {
    const client = new Client({
        user: 'tidsanda',
        host: 'localhost',
        database: 'tidsanda',
        password: 'Asas1212',
    });
    await client.connect();
    return client;
}

export const client = connection();
