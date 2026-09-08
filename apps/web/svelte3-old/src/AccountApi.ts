import type { Account } from './types';

export function getAccount() {
  return window.localStorage.getItem('account');
}

export function logoutAccount() {
  window.localStorage.removeItem('account');
}

// export const url = 'http://localhost:3000/api';
// export const url = 'https://n2oawj8lu6.execute-api.eu-central-1.amazonaws.com/api';
export const url = 'https://m3km4vgjt2ydd6p2mgwsvmxysy0oanwt.lambda-url.eu-central-1.on.aws/api';

export async function apiGet<T>(url: string, customAccount?: string): Promise<T> {
  const headers = new Headers();
  headers.append('Authorization', `Basic ${btoa((customAccount || getAccount()) + ':')}`);
  const response = await fetch(url, {
    credentials: 'same-origin',
    mode: 'cors',
    headers,
  });
  const json = await response.json();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(json.error);
  }
  return json;
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const headers = new Headers();
  headers.append('Authorization', `Basic ${btoa(getAccount() + ':')}`);
  // headers.append('Content-Type', 'application/json');
  const response = await fetch(url, {
    credentials: 'same-origin',
    mode: 'cors',
    headers,
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(json.error);
  }
  return json;
}

export async function apiPut<T>(url: string, body: any): Promise<T> {
  const headers = new Headers();
  headers.append('Authorization', `Basic ${btoa(getAccount() + ':')}`);
  // headers.append('Content-Type', 'application/json');
  const response = await fetch(url, {
    credentials: 'same-origin',
    mode: 'cors',
    headers,
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(json.error);
  }
  return json;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const headers = new Headers();
  headers.append('Authorization', `Basic ${btoa(getAccount() + ':')}`);
  // headers.append('Content-Type', 'application/json');
  const response = await fetch(url, {
    credentials: 'same-origin',
    mode: 'cors',
    headers,
    method: 'DELETE',
  });
  const json = await response.json();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(json.error);
  }
  return json;
}

export async function login(loginAccount: string) {
  await apiGet(`${url}/accounts/${loginAccount}`, loginAccount)
    .then(() => {
      window.localStorage.setItem('account', loginAccount);
    })
    .catch((err) => {
      window.localStorage.removeItem('account');
      throw err;
    });

  return getAccount();
}

export async function createAccount() {
  await apiPost<Account>(`${url}/accounts`, {}).then((account) => {
    window.localStorage.setItem('account', account.apiKey);
  });
}
