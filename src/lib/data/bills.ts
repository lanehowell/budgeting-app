import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb, userCollectionStore } from '$lib/firebase/stores';
import type { Bill } from '$lib/types';

export const bills = userCollectionStore<Omit<Bill, 'id'>>('bills', () => [
	orderBy('dueDay', 'asc')
]);

function uid(): string {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	return user.uid;
}

export async function addBill(data: Omit<Bill, 'id'>): Promise<string> {
	const ref = await addDoc(collection(getDb(), `users/${uid()}/bills`), data);
	return ref.id;
}

export async function updateBill(id: string, patch: Partial<Omit<Bill, 'id'>>) {
	await updateDoc(doc(getDb(), `users/${uid()}/bills/${id}`), patch);
}

export async function deleteBill(id: string) {
	await deleteDoc(doc(getDb(), `users/${uid()}/bills/${id}`));
}
