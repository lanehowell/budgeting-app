import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb } from '$lib/firebase/stores';
import {
	mockBills,
	mockBillPayments,
	mockCategories,
	mockMerchantRules,
	mockTransactions
} from '$lib/mock/data';

const MOCK_TX_IDS = mockTransactions.map((t) => t.id);
const MOCK_BILL_IDS = mockBills.map((b) => b.id);
const MOCK_PAY_IDS = mockBillPayments.map((p) => p.id);
const MOCK_RULE_IDS = mockMerchantRules.map((r) => r.id);
const MOCK_CAT_IDS = mockCategories.map((c) => c.id);

/**
 * Dev-only: load the mock fixtures into the current user's Firestore.
 * Used to seed the emulator quickly. Idempotent — overwrites by id.
 */
export async function seedMockData(): Promise<{ written: number }> {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	const uid = user.uid;
	const db = getDb();

	const batch = writeBatch(db);
	let count = 0;

	for (const cat of mockCategories) {
		const { id, ...rest } = cat;
		batch.set(doc(collection(db, `users/${uid}/categories`), id), rest);
		count++;
	}
	for (const bill of mockBills) {
		const { id, ...rest } = bill;
		batch.set(doc(collection(db, `users/${uid}/bills`), id), rest);
		count++;
	}
	for (const pay of mockBillPayments) {
		const { id, ...rest } = pay;
		batch.set(doc(collection(db, `users/${uid}/billPayments`), id), rest);
		count++;
	}
	for (const tx of mockTransactions) {
		const { id, ...rest } = tx;
		batch.set(doc(collection(db, `users/${uid}/transactions`), id), rest);
		count++;
	}
	for (const rule of mockMerchantRules) {
		const { id, ...rest } = rule;
		batch.set(doc(collection(db, `users/${uid}/merchantRules`), id), rest);
		count++;
	}

	await batch.commit();
	return { written: count };
}

/**
 * Delete only the mock-seeded docs (by known IDs). Real data stays untouched.
 */
export async function clearMockData(): Promise<{ deleted: number }> {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	const uid = user.uid;
	const db = getDb();

	const batch = writeBatch(db);
	let count = 0;

	const queue: Array<[string, string[]]> = [
		[`users/${uid}/transactions`, MOCK_TX_IDS],
		[`users/${uid}/bills`, MOCK_BILL_IDS],
		[`users/${uid}/billPayments`, MOCK_PAY_IDS],
		[`users/${uid}/merchantRules`, MOCK_RULE_IDS],
		[`users/${uid}/categories`, MOCK_CAT_IDS]
	];

	for (const [path, ids] of queue) {
		for (const id of ids) {
			batch.delete(doc(collection(db, path), id));
			count++;
		}
	}

	await batch.commit();
	return { deleted: count };
}
