<script lang="ts">
	import { goto } from '$app/navigation';
	import { signInWithGoogle, authState } from '$lib/firebase/auth';

	let signingIn = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		const unsub = authState.subscribe((s) => {
			if (s.user && !s.loading) {
				goto('/bills', { replaceState: true });
			}
		});
		return unsub;
	});

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
		<h1 class="title-1">Budget</h1>
		<p class="tagline subheadline">A personal budget tool that doesn't guess.</p>

		<button class="google-btn" onclick={handleGoogle} disabled={signingIn}>
			<svg class="g-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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

		{#if error}
			<p class="error footnote">{error}</p>
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
		gap: 16px;
		text-align: center;
		padding: 32px 24px;
	}

	.tagline {
		color: var(--text-secondary);
		margin-bottom: 16px;
	}

	.google-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 14px 20px;
		min-height: 50px;
		border-radius: 999px;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--separator);
		font-size: 17px;
		font-weight: 600;
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
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
	}

	.error {
		color: var(--danger);
	}
</style>
