<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        large = false,
        disabled = false,
        type = "button",
        ariaLabel,
        onclick,
        children,
    }: {
        large?: boolean;
        disabled?: boolean;
        type?: "button" | "submit" | "reset";
        ariaLabel?: string;
        onclick?: (event: MouseEvent) => void;
        children: Snippet;
    } = $props();
</script>

<button {onclick} {type} class={large ? "large" : ""} {disabled} aria-label={ariaLabel}
    >{@render children()}</button
>

<style lang="scss">
    button {
        box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
        color: var(--col-grey-70);
        border: 1px solid var(--col-grey-70);
        background: var(--col-grey-40);
        font-size: 1.1rem;
        border-radius: 0;

        &.large {
            font-size: 1.4rem;
        }

        &:active {
            box-shadow: none;
            color: var(--col-grey-50);
        }

        &:disabled {
            border-color: var(--col-grey-50);
            box-shadow: none;
            color: var(--col-grey-50);
        }
    }
</style>
