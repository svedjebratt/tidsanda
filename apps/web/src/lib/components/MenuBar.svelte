<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { shouldIgnoreShortcut } from "$lib/keyboard";
    import { pomodoro } from "$lib/stores/pomodoroStore";
    import { current } from "$lib/stores/timerStore";

    let { active = "timer" } = $props<{
        active?: "timer" | "pomodoro" | "logs" | "user";
    }>();

    onMount(() => {
        function listener(e: KeyboardEvent): void {
            if (shouldIgnoreShortcut(e)) {
                return;
            }
            switch (e.key.toLowerCase()) {
                case "t":
                    e.preventDefault();
                    goto("/timer");
                    break;
                case "p":
                    e.preventDefault();
                    goto("/pomodoro");
                    break;
                case "l":
                    e.preventDefault();
                    goto("/log/day/0");
                    break;
            }
        }
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    });
</script>

<nav>
    <a href="/timer" class={active === "timer" ? "active" : ""}
        >Timer<span
            class:running={$current !== null}
            class="running-indicator"
            aria-hidden="true"
        ></span>{#if $current}<span class="sr-only"> running</span>{/if}</a
    >
    <a href="/pomodoro" class={active === "pomodoro" ? "active" : ""}
        >Pomodoro<span
            class:running={$pomodoro.status === "running"}
            class="running-indicator"
            aria-hidden="true"
        ></span>{#if $pomodoro.status === "running"}<span class="sr-only">
                running</span
            >{/if}</a
    >
    <a href="/log/day/0" class={active === "logs" ? "active" : ""}>History</a>
    <a
        href="/user"
        class={active === "user" ? "active" : ""}
        aria-label="Account"><i class="bi bi-person"></i></a
    >
</nav>

<style lang="scss">
    nav {
        height: 32px;
        list-style-type: none;
        padding: 0;
        margin: 0 0 1rem;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        border-bottom: 1px solid var(--col-black);
    }

    a {
        font-size: 14px;
        line-height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        color: var(--col-grey-70);
        padding: 6px 15px 10px;
        margin-bottom: -1px;
        border: 1px solid transparent;

        &.active {
            border-color: var(--col-black);
            border-bottom-color: var(--col-white);
        }

        &:hover:not(.active) {
            border-color: var(--col-grey-40);
            border-bottom-color: transparent;
        }

        &:last-child {
            padding-left: 10px;
            padding-right: 10px;
        }
    }

    .running-indicator {
        width: 6px;
        height: 6px;
        margin-left: 6px;
        border-radius: 50%;
        background: #0d6efd;
        display: none;

        &.running {
            display: block;
        }
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
</style>
