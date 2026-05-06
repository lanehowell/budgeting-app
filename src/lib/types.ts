export type Category = {
	id: string;
	name: string;
	color: string;
	icon: string;
	isTransferCategory: boolean;
	excludeFromSpending: boolean;
	sortOrder: number;
};

export type Transaction = {
	id: string;
	accountId: string;
	postedDate: string;
	amount: number;
	rawDescription: string;
	displayName: string;
	categoryId: string | null;
	isTransfer: boolean;
	pending: boolean;
	simpleFinId: string;
	dedupeKey: string;
	notes?: string;
	parentTransactionId?: string;
	isSplit?: boolean;
	transferSuggested?: boolean;
	transferPairId?: string;
	createdAt: string;
	updatedAt: string;
};

export type Recurrence = 'monthly' | 'biweekly' | 'yearly';

export type Bill = {
	id: string;
	name: string;
	amount: number;
	dueDay: number;
	categoryId: string;
	recurrence: Recurrence;
	isActive: boolean;
	createdAt: string;
};

export type BillPayment = {
	id: string;
	billId: string;
	periodKey: string;
	amount: number;
	paidDate: string;
	transactionId: string | null;
	notes?: string;
	autoLinked?: boolean;
};

export type MerchantRule = {
	id: string;
	pattern: string;
	matchType: 'contains' | 'startsWith' | 'regex';
	categoryId: string;
	displayName: string;
	priority: number;
	createdAt: string;
};

export type PayPeriodType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type Settings = {
	payPeriodType: PayPeriodType;
	payPeriodStartDate: string;
	payPeriodLength: number;
	theme: 'light' | 'dark' | 'system';
	defaultPage: 'bills' | 'transactions' | 'spending' | 'profile';
	lastSimpleFinSync: string | null;
};

export type Account = {
	id: string;
	name: string;
	institution: string;
	mask: string;
};
