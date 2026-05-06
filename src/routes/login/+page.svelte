<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
	import {
		signInWithGoogle,
		signInWithGoogleIdToken,
		isIosStandalonePwa,
		authState
	} from '$lib/firebase/auth';

	let signingIn = $state(false);
	let error = $state<string | null>(null);
	let useGis = $state(false);
	let gisContainer: HTMLDivElement | undefined = $state();

	$effect(() => {
		const unsub = authState.subscribe((s) => {
			if (s.user && !s.loading) {
				goto('/bills', { replaceState: true });
			}
		});
		return unsub;
	});

	$effect(() => {
		if (!browser) return;
		useGis = isIosStandalonePwa() && !!PUBLIC_GOOGLE_CLIENT_ID;
		if (useGis) renderGisButton();
	});

	function renderGisButton(retries = 20) {
		if (!gisContainer) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const g = (window as any).google;
		if (!g?.accounts?.id) {
			if (retries > 0) setTimeout(() => renderGisButton(retries - 1), 250);
			return;
		}
		try {
			g.accounts.id.initialize({
				client_id: PUBLIC_GOOGLE_CLIENT_ID,
				callback: handleGisCredential,
				ux_mode: 'popup',
				auto_select: false,
				cancel_on_tap_outside: true
			});
			gisContainer.innerHTML = '';
			g.accounts.id.renderButton(gisContainer, {
				type: 'standard',
				theme: 'filled_black',
				size: 'large',
				text: 'signin_with',
				shape: 'pill',
				logo_alignment: 'left',
				width: Math.min(280, gisContainer.offsetWidth || 280)
			});
		} catch (err) {
			console.error('GIS render failed', err);
			error = 'Sign-in unavailable. Try refreshing.';
		}
	}

	async function handleGisCredential(response: { credential?: string }) {
		if (!response?.credential) {
			error = 'Sign-in returned no credential.';
			return;
		}
		signingIn = true;
		error = null;
		try {
			await signInWithGoogleIdToken(response.credential);
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Sign-in failed';
			signingIn = false;
		}
	}

	async function handleGoogle() {
		signingIn = true;
		error = null;
		try {
			await signInWithGoogle();
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Sign-in failed';
			signingIn = false;
		}
	}
</script>

<div class="login">
	<div class="card">
		<div class="brand">
			<div class="mark">●</div>
			<h1 class="title">Budget</h1>
		</div>
		<p class="tagline">A personal budget that doesn't guess.</p>

		{#if useGis}
			<div class="gis-wrap" bind:this={gisContainer}></div>
		{:else}
			<button class="google-btn" onclick={handleGoogle} disabled={signingIn}>
				<svg class="g-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.997 10.997 0 0 0 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A10.997 10.997 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
					/>
				</svg>
				<span>{signingIn ? 'Signing in…' : 'Continue with Google'}</span>
			</button>
		{/if}

		{#if error}
			<p class="error">{error}</p>
		{/if}
	</div>
</div>

<style>
	.login {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: var(--bg-primary);
	}

	.card {
		width: 100%;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		text-align: center;
		padding: 32px 24px;
	}

	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.mark {
		color: var(--text-primary);
		font-size: 22px;
		line-height: 1;
	}

	.title {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.022em;
		color: var(--text-primary);
	}

	.tagline {
		color: var(--text-secondary);
		font-size: 14px;
		margin-bottom: 18px;
	}

	.google-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 13px 20px;
		min-height: 46px;
		border-radius: 999px;
		background: var(--text-primary);
		color: var(--bg-primary);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.007em;
		transition:
			transform 100ms var(--ease-standard),
			opacity 150ms var(--ease-standard);
	}

	.google-btn:active:not(:disabled) {
		transform: scale(0.97);
	}

	.google-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.g-icon {
		flex-shrink: 0;
		background: white;
		padding: 2px;
		border-radius: 50%;
	}

	.gis-wrap {
		display: flex;
		justify-content: center;
		min-height: 46px;
	}

	.error {
		color: var(--danger);
		font-size: 12px;
	}
</style>
