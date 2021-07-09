import { Account } from '../types'
import { client } from './connection';

interface DbAccount {
    api_key: string;
    admin: boolean;
}

function toAccount(dbAccount: DbAccount): Account {
    return { apiKey: dbAccount.api_key, admin: dbAccount.admin };
}

export async function createAccount(apiKey: string): Promise<Account> {
    const query = 'INSERT INTO accounts (api_key) VALUES ($1) RETURNING *';
    const result = await (await client).query<DbAccount>(query, [apiKey]);
    return result.rows.map(toAccount)[0];
}

export async function getAccounts(): Promise<Account[]> {
    const query = 'SELECT * FROM accounts';
    const res = await (await client).query<DbAccount>(query);
    return res.rows.map(toAccount);
}

export async function getAccount(apiKey: string) {
    const query = 'SELECT * FROM accounts WHERE api_key=$1';
    const res = await (await client).query<DbAccount>(query, [apiKey]);
    return res.rows.map(toAccount)[0];
}
