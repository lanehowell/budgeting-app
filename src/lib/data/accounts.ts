import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase/client';
import { userCollectionStore } from '$lib/firebase/stores';

export type AccountDoc = {
	name: string;
	institution: string;
	mask: string;
	currency: string;
	balance: number;
	availableBalance: number;
	balanceDate: string | null;
	lastSync: string;
};

export const accounts = userCollectionStore<AccountDoc>('accounts');

export type ConnectResult = { connected: true; accounts: number };
export type SyncResult = { imported: number; updated: number; accounts: number };
export type DisconnectResult = { disconnected: true };

export async function simpleFinConnect(setupToken: string): Promise<ConnectResult> {
	const fn = httpsCallable<{ setupToken: string }, ConnectResult>(functions(), 'simpleFinConnect');
	const result = await fn({ setupToken });
	return result.data;
}

export async function simpleFinSync(): Promise<SyncResult> {
	const fn = httpsCallable<Record<string, never>, SyncResult>(functions(), 'simpleFinSync');
	const result = await fn({});
	return result.data;
}

export async function simpleFinDisconnect(): Promise<DisconnectResult> {
	const fn = httpsCallable<Record<string, never>, DisconnectResult>(
		functions(),
		'simpleFinDisconnect'
	);
	const result = await fn({});
	return result.data;
}
