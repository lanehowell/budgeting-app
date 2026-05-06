import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb, userCollectionStore } from '$lib/firebase/stores';
import type { MerchantRule } from '$lib/types';

export const merchantRules = userCollectionStore<Omit<MerchantRule, 'id'>>('merchantRules', () => [
	orderBy('priority', 'desc')
]);

function uid(): string {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	return user.uid;
}

export async function addMerchantRule(
	data: Omit<MerchantRule, 'id'>
): Promise<string> {
	const ref = await addDoc(collection(getDb(), `users/${uid()}/merchantRules`), data);
	return ref.id;
}

export async function updateMerchantRule(
	id: string,
	patch: Partial<Omit<MerchantRule, 'id'>>
) {
	await updateDoc(doc(getDb(), `users/${uid()}/merchantRules/${id}`), patch);
}

export async function deleteMerchantRule(id: string) {
	await deleteDoc(doc(getDb(), `users/${uid()}/merchantRules/${id}`));
}
