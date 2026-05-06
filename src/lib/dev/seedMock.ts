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
