import { browser } from '$app/environment';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_USE_FIREBASE_EMULATOR
} from '$env/static/public';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import {
	connectFunctionsEmulator,
	getFunctions,
	type Functions
} from 'firebase/functions';

const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let emulatorsConnected = false;

function ensureApp(): FirebaseApp {
	if (app) return app;
	app = getApps()[0] ?? initializeApp(firebaseConfig);
	return app;
}

export function firebaseApp(): FirebaseApp {
	return ensureApp();
}

export function auth(): Auth {
	if (authInstance) return authInstance;
	authInstance = getAuth(ensureApp());
	connectEmulatorsIfEnabled();
	return authInstance;
}

export function db(): Firestore {
	if (dbInstance) return dbInstance;
	dbInstance = getFirestore(ensureApp());
	connectEmulatorsIfEnabled();
	return dbInstance;
}

export function functions(): Functions {
	if (functionsInstance) return functionsInstance;
	functionsInstance = getFunctions(ensureApp());
	connectEmulatorsIfEnabled();
	return functionsInstance;
}

function connectEmulatorsIfEnabled() {
	if (!browser || emulatorsConnected) return;
	if (PUBLIC_USE_FIREBASE_EMULATOR !== 'true') return;
	emulatorsConnected = true;
	try {
		if (authInstance) {
			connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
		}
		if (dbInstance) {
			connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
		}
		if (functionsInstance) {
			connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
		}
	} catch (err) {
		console.warn('Emulator connection failed', err);
	}
}
