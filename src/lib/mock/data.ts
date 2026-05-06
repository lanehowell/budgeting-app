import type {
	Account,
	Bill,
	BillPayment,
	Category,
	MerchantRule,
	Transaction
} from '$lib/types';

export const mockCategories: Category[] = [
	{
		id: 'cat-transfer',
		name: 'Transfer',
		color: '#8E8E93',
		icon: 'arrow-left-right',
		isTransferCategory: true,
		excludeFromSpending: true,
		sortOrder: 0
	},
	{
		id: 'cat-groceries',
		name: 'Groceries',
		color: '#34C759',
		icon: 'shopping-cart',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 1
	},
	{
		id: 'cat-dining',
		name: 'Dining',
		color: '#FF9500',
		icon: 'utensils',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 2
	},
	{
		id: 'cat-coffee',
		name: 'Coffee',
		color: '#A2845E',
		icon: 'coffee',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 3
	},
	{
		id: 'cat-gas',
		name: 'Gas',
		color: '#FF3B30',
		icon: 'fuel',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 4
	},
	{
		id: 'cat-utilities',
		name: 'Utilities',
		color: '#5856D6',
		icon: 'zap',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 5
	},
	{
		id: 'cat-rent',
		name: 'Rent',
		color: '#007AFF',
		icon: 'home',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 6
	},
	{
		id: 'cat-subscriptions',
		name: 'Subscriptions',
		color: '#AF52DE',
		icon: 'repeat',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 7
	},
	{
		id: 'cat-household',
		name: 'Household',
		color: '#30B0C7',
		icon: 'package',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 8
	},
	{
		id: 'cat-entertainment',
		name: 'Entertainment',
		color: '#FF2D55',
		icon: 'film',
		isTransferCategory: false,
		excludeFromSpending: false,
		sortOrder: 9
	},
	{
		id: 'cat-reimbursement',
		name: 'Reimbursement',
		color: '#8E8E93',
		icon: 'undo-2',
		isTransferCategory: false,
		excludeFromSpending: true,
		sortOrder: 10
	}
];

export const mockAccounts: Account[] = [
	{ id: 'acc-checking', name: 'Everyday Checking', institution: 'Chase', mask: '4421' },
	{ id: 'acc-savings', name: 'Savings', institution: 'Chase', mask: '8810' },
	{ id: 'acc-credit', name: 'Sapphire Card', institution: 'Chase', mask: '0095' }
];

const today = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
	const d = new Date(today);
	d.setDate(d.getDate() - n);
	return iso(d);
};

export const mockTransactions: Transaction[] = [
	{
		id: 'tx-1',
		accountId: 'acc-credit',
		postedDate: daysAgo(0),
		amount: -6.85,
		rawDescription: 'TST* BLUE BOTTLE COFFEE 4155551234',
		displayName: 'Blue Bottle Coffee',
		categoryId: null,
		isTransfer: false,
		pending: true,
		simpleFinId: 'sf-1',
		dedupeKey: 'dk-1',
		createdAt: daysAgo(0),
		updatedAt: daysAgo(0)
	},
	{
		id: 'tx-2',
		accountId: 'acc-credit',
		postedDate: daysAgo(1),
		amount: -82.31,
		rawDescription: 'SQ *TARGET 00012345 MINNEAPOLIS MN',
		displayName: 'Target',
		categoryId: null,
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-2',
		dedupeKey: 'dk-2',
		createdAt: daysAgo(1),
		updatedAt: daysAgo(1)
	},
	{
		id: 'tx-3',
		accountId: 'acc-credit',
		postedDate: daysAgo(2),
		amount: -47.12,
		rawDescription: 'POS DEBIT 1234 SHELL OIL #5678 PORTLAND',
		displayName: 'Shell',
		categoryId: null,
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-3',
		dedupeKey: 'dk-3',
		createdAt: daysAgo(2),
		updatedAt: daysAgo(2)
	},
	{
		id: 'tx-4',
		accountId: 'acc-checking',
		postedDate: daysAgo(3),
		amount: -1450.0,
		rawDescription: 'ACH RENT PAYMENT MAPLE PROPERTIES',
		displayName: 'Maple Properties',
		categoryId: 'cat-rent',
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-4',
		dedupeKey: 'dk-4',
		createdAt: daysAgo(3),
		updatedAt: daysAgo(3)
	},
	{
		id: 'tx-5',
		accountId: 'acc-credit',
		postedDate: daysAgo(4),
		amount: -132.44,
		rawDescription: 'WHOLEFDS WPL 10301',
		displayName: 'Whole Foods',
		categoryId: 'cat-groceries',
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-5',
		dedupeKey: 'dk-5',
		createdAt: daysAgo(4),
		updatedAt: daysAgo(4)
	},
	{
		id: 'tx-6',
		accountId: 'acc-checking',
		postedDate: daysAgo(5),
		amount: -500.0,
		rawDescription: 'ONLINE TRANSFER TO SAVINGS XXXX8810',
		displayName: 'Transfer to Savings',
		categoryId: 'cat-transfer',
		isTransfer: true,
		pending: false,
		simpleFinId: 'sf-6',
		dedupeKey: 'dk-6',
		createdAt: daysAgo(5),
		updatedAt: daysAgo(5)
	},
	{
		id: 'tx-7',
		accountId: 'acc-savings',
		postedDate: daysAgo(5),
		amount: 500.0,
		rawDescription: 'ONLINE TRANSFER FROM CHECKING XXXX4421',
		displayName: 'Transfer from Checking',
		categoryId: 'cat-transfer',
		isTransfer: true,
		pending: false,
		simpleFinId: 'sf-7',
		dedupeKey: 'dk-7',
		createdAt: daysAgo(5),
		updatedAt: daysAgo(5)
	},
	{
		id: 'tx-8',
		accountId: 'acc-credit',
		postedDate: daysAgo(6),
		amount: -14.99,
		rawDescription: 'NETFLIX.COM',
		displayName: 'Netflix',
		categoryId: 'cat-subscriptions',
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-8',
		dedupeKey: 'dk-8',
		createdAt: daysAgo(6),
		updatedAt: daysAgo(6)
	},
	{
		id: 'tx-9',
		accountId: 'acc-credit',
		postedDate: daysAgo(7),
		amount: -28.5,
		rawDescription: 'TST* SWEETGREEN PORTLAND OR',
		displayName: 'Sweetgreen',
		categoryId: null,
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-9',
		dedupeKey: 'dk-9',
		createdAt: daysAgo(7),
		updatedAt: daysAgo(7)
	},
	{
		id: 'tx-10',
		accountId: 'acc-credit',
		postedDate: daysAgo(8),
		amount: -64.21,
		rawDescription: 'TRADER JOES #178 PORTLAND OR',
		displayName: 'Trader Joes',
		categoryId: 'cat-groceries',
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-10',
		dedupeKey: 'dk-10',
		createdAt: daysAgo(8),
		updatedAt: daysAgo(8)
	},
	{
		id: 'tx-11',
		accountId: 'acc-credit',
		postedDate: daysAgo(9),
		amount: -22.0,
		rawDescription: 'AMC PORTLAND 17',
		displayName: 'AMC Theatres',
		categoryId: 'cat-entertainment',
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-11',
		dedupeKey: 'dk-11',
		createdAt: daysAgo(9),
		updatedAt: daysAgo(9)
	},
	{
		id: 'tx-12',
		accountId: 'acc-credit',
		postedDate: daysAgo(10),
		amount: -4.75,
		rawDescription: 'SQ *STUMPTOWN COFFEE',
		displayName: 'Stumptown Coffee',
		categoryId: 'cat-coffee',
		isTransfer: false,
		pending: false,
		simpleFinId: 'sf-12',
		dedupeKey: 'dk-12',
		createdAt: daysAgo(10),
		updatedAt: daysAgo(10)
	}
];

export const mockBills: Bill[] = [
	{
		id: 'bill-rent',
		name: 'Rent',
		amount: 1450,
		dueDay: 1,
		categoryId: 'cat-rent',
		recurrence: 'monthly',
		isActive: true,
		createdAt: daysAgo(120)
	},
	{
		id: 'bill-electric',
		name: 'PGE Electric',
		amount: 84.5,
		dueDay: 12,
		categoryId: 'cat-utilities',
		recurrence: 'monthly',
		isActive: true,
		createdAt: daysAgo(120)
	},
	{
		id: 'bill-internet',
		name: 'Comcast Internet',
		amount: 79.99,
		dueDay: 18,
		categoryId: 'cat-utilities',
		recurrence: 'monthly',
		isActive: true,
		createdAt: daysAgo(120)
	},
	{
		id: 'bill-netflix',
		name: 'Netflix',
		amount: 14.99,
		dueDay: 22,
		categoryId: 'cat-subscriptions',
		recurrence: 'monthly',
		isActive: true,
		createdAt: daysAgo(120)
	},
	{
		id: 'bill-spotify',
		name: 'Spotify',
		amount: 11.99,
		dueDay: 28,
		categoryId: 'cat-subscriptions',
		recurrence: 'monthly',
		isActive: true,
		createdAt: daysAgo(120)
	},
	{
		id: 'bill-water',
		name: 'Water Bureau',
		amount: 62.0,
		dueDay: 5,
		categoryId: 'cat-utilities',
		recurrence: 'monthly',
		isActive: true,
		createdAt: daysAgo(120)
	}
];

const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

export const mockBillPayments: BillPayment[] = [
	{
		id: 'pay-1',
		billId: 'bill-rent',
		periodKey: currentMonthKey,
		amount: 1450,
		paidDate: daysAgo(3),
		transactionId: 'tx-4'
	},
	{
		id: 'pay-2',
		billId: 'bill-water',
		periodKey: currentMonthKey,
		amount: 62.0,
		paidDate: daysAgo(2),
		transactionId: null
	}
];

export const mockMerchantRules: MerchantRule[] = [
	{
		id: 'rule-1',
		pattern: 'NETFLIX',
		matchType: 'contains',
		categoryId: 'cat-subscriptions',
		displayName: 'Netflix',
		priority: 10,
		createdAt: daysAgo(60)
	},
	{
		id: 'rule-2',
		pattern: 'WHOLEFDS',
		matchType: 'contains',
		categoryId: 'cat-groceries',
		displayName: 'Whole Foods',
		priority: 10,
		createdAt: daysAgo(60)
	},
	{
		id: 'rule-3',
		pattern: 'SHELL',
		matchType: 'contains',
		categoryId: 'cat-gas',
		displayName: 'Shell',
		priority: 10,
		createdAt: daysAgo(60)
	},
	{
		id: 'rule-4',
		pattern: 'ONLINE TRANSFER',
		matchType: 'startsWith',
		categoryId: 'cat-transfer',
		displayName: 'Account Transfer',
		priority: 20,
		createdAt: daysAgo(60)
	}
];

export const currentPeriodKey = currentMonthKey;
