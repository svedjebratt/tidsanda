<script lang="ts">
	import { onMount } from 'svelte';
	import { createAccount, login as apiLogin, logoutAccount } from '$lib/api/AccountApi';
	import { goto } from '$app/navigation';
	import Button from './Button.svelte';

	let { logout = false } = $props<{ logout?: boolean }>();
	let account = $state('');

	function createNew() {
		console.log('create the new stuff');
		createAccount()
			.then(() => goto('/timer'))
			.catch((err) => console.log('Could not create new account', err));
	}

	async function login() {
		await apiLogin(account);
		goto('/timer');
	}

	onMount(() => {
		if (logout) {
			logoutAccount();
			goto('/');
		}
	});
</script>

<main>
	<div>
		<div>
			<Button onclick={createNew}>Create new account</Button>
		</div>
		<div class="separator"><span>or</span></div>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void login();
			}}
		>
			<input
				class="form-control"
				type="text"
				bind:value={account}
				placeholder="Use existing account"
			/>
		</form>
	</div>
</main>

<style>
	main {
		text-align: center;
	}

	.separator {
		position: relative;
		text-align: center;
		margin: 2rem 0;
	}

	.separator span {
		position: relative;
		padding: 0 1rem;
		display: inline-block;
		background: #fff;
		z-index: 99;
	}

	.separator::after {
		content: '';
		position: absolute;
		top: 50%;
		display: block;
		width: 100%;
		height: 2px;
		background: #ccc;
	}
</style>
