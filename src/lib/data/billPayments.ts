import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	query,
	where
} from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb, userCollectionStore } from '$lib/firebase/stores';
import type { BillPayment } from '$lib/types';

export const billPayments = userCollectionStore<Omit<BillPayment, 'id'>>('billPayments');

function uid(): string {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	return user.uid;
}

export async function recordBillPayment(
	data: Omit<BillPayment, 'id'>
): Promise<string> {
	const ref = await addDoc(collection(getDb(), `users/${uid()}/billPayments`), data);
	return ref.id;
}

/**
 * Toggle paid status for a (billId, periodKey) pair. Creates a payment if
 * none exists; deletes all matching payments if one does.
 */
export async function toggleBillPaid(
	billId: string,
	periodKey: string,
	amount: number
): Promise<void> {
	const u = uid();
	const ref = collection(getDb(), `users/${u}/billPayments`);
	const q = query(ref, where('billId', '==', billId), where('periodKey', '==', periodKey));
	const snap = await getDocs(q);
	if (!snap.empty) {
		await Promise.all(
			snap.docs.map((d) => deleteDoc(doc(getDb(), `users/${u}/billPayments/${d.id}`)))
		);
		return;
	}
	await addDoc(ref, {
		billId,
		periodKey,
		amount,
		paidDate: new Date().toISOString(),
		transactionId: null
	} satisfies Omit<BillPayment, 'id'>);
}
