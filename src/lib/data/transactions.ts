import { collection, doc, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb, userCollectionStore } from '$lib/firebase/stores';
import type { Transaction } from '$lib/types';

export const transactions = userCollectionStore<Omit<Transaction, 'id'>>('transactions', () => [
	orderBy('postedDate', 'desc')
]);

function uid(): string {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	return user.uid;
}

export async function updateTransaction(
	id: string,
	patch: Partial<Omit<Transaction, 'id'>>
): Promise<void> {
	await updateDoc(doc(getDb(), `users/${uid()}/transactions/${id}`), {
		...patch,
		updatedAt: new Date().toISOString()
	});
}

/**
 * Used by dev seed flows. Production transactions are created server-side
 * by the SimpleFIN sync Cloud Function.
 */
export async function upsertTransaction(tx: Transaction): Promise<void> {
	const { id, ...rest } = tx;
	await setDoc(doc(getDb(), `users/${uid()}/transactions/${id}`), rest);
}
