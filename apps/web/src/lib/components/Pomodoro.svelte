<script lang="ts">
    import { onMount } from "svelte";
    import { getAccount } from "$lib/api/AccountApi";
    import {
        createInitialPomodoroState,
        createPomodoroTimer,
        pomodoroDurations,
        type PomodoroState,
        type PomodoroUpdate,
    } from "$lib/pomodoro";
    import { shouldIgnoreShortcut } from "$lib/keyboard";
    import Button from "./Button.svelte";
    import MenuBar from "./MenuBar.svelte";

    let state = $state<PomodoroState>(createInitialPomodoroState(0));
    let timer: ReturnType<typeof createPomodoroTimer> | null = null;

    let phaseName = $derived(state.phase === "focus" ? "Focus" : "Break");
    let actionName = $derived(
        state.status === "running"
            ? "Pause"
            : state.status === "paused"
              ? "Resume"
              : `Start ${phaseName}`,
    );
    let elapsedPercent = $derived(
        Math.min(
            100,
            Math.max(
                0,
                ((pomodoroDurations[state.phase] - state.remainingMs) /
                    pomodoroDurations[state.phase]) *
                    100,
            ),
        ),
    );
    let formattedTime = $derived(formatDuration(state.remainingMs));

    function formatDuration(milliseconds: number) {
        const seconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
    }

    function requestNotifications() {
        if ("Notification" in window && Notification.permission === "default") {
            void Notification.requestPermission();
        }
    }

    function applyUpdate(update: PomodoroUpdate) {
        state = update.state;
        if (
            update.completedPhase &&
            update.completedAt !== null &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            timer?.claimNotification(update.completedPhase, update.completedAt)
        ) {
            const completedFocus = update.completedPhase === "focus";
            const notification = new Notification(
                completedFocus ? "Focus complete" : "Break complete",
                {
                    body: completedFocus ? "Time for a break" : "Time to focus",
                },
            );
            notification.onclick = () => window.focus();
        }
    }

    function advance() {
        if (!timer) return;
        requestNotifications();
        applyUpdate(timer.advance());
    }

    function reset() {
        if (timer) state = timer.reset();
    }

    onMount(() => {
        const account = getAccount();
        if (!account) return;

        timer = createPomodoroTimer(account, localStorage);
        state = timer.read();
        const interval = window.setInterval(() => {
            if (timer) applyUpdate(timer.update());
        }, 250);

        function handleStorage(event: StorageEvent) {
            if (event.key === timer?.storageKey && timer) state = timer.read();
        }

        function handleKeydown(event: KeyboardEvent) {
            if (event.key !== " " || shouldIgnoreShortcut(event)) {
                return;
            }
            event.preventDefault();
            advance();
        }

        window.addEventListener("storage", handleStorage);
        document.addEventListener("keydown", handleKeydown);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("storage", handleStorage);
            document.removeEventListener("keydown", handleKeydown);
        };
    });
</script>

<main>
    <div>
        <MenuBar active="pomodoro" />
        <section
            class:focus={state.phase === "focus"}
            class:break={state.phase === "break"}
        >
            <p class="status">
                {state.status === "paused"
                    ? "Paused"
                    : state.status === "waiting"
                      ? "Ready"
                      : "Running"}
            </p>
            <h1>{phaseName}</h1>
            <div class="time">{formattedTime}</div>
            <div
                class="progress-track"
                role="progressbar"
                aria-label={`${phaseName} progress`}
                aria-valuenow={Math.round(elapsedPercent)}
                aria-valuemin="0"
                aria-valuemax="100"
            >
                <div class="progress" style={`width: ${elapsedPercent}%`}></div>
            </div>
            <div class="actions">
                <Button onclick={advance} large>{actionName}</Button>
                <button type="button" class="reset" onclick={reset}
                    >Reset</button
                >
            </div>
            <!-- <p class="shortcut"><kbd>Space</kbd> {actionName.toLowerCase()}</p> -->
        </section>
    </div>
</main>

<style lang="scss">
    section {
        --accent: #b15c38;
        --accent-soft: #f1ddd4;
        padding: 2.5rem 1.5rem 1.5rem;
        // border: 1px solid var(--col-grey-30);
        // background: linear-gradient(
        //     180deg,
        //     var(--accent-soft),
        //     var(--col-white) 58%
        // );
        text-align: center;

        &.break {
            --accent: #287b78;
            --accent-soft: #d8ecea;
        }
    }

    .status {
        margin: 0;
        color: var(--accent);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    h1 {
        margin: 0.25rem 0 0;
        font-size: 1.25rem;
        font-weight: 500;
    }

    .time {
        margin: 0.5rem 0 1.25rem;
        font-size: clamp(3.5rem, 17vw, 5rem);
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        letter-spacing: -0.06em;
        line-height: 1;
    }

    .progress-track {
        height: 5px;
        background: var(--col-grey-20);
        overflow: hidden;
    }

    .progress {
        height: 100%;
        background: var(--accent);
        transition: width 250ms linear;
    }

    .actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-5);
        margin-top: 2rem;
    }

    .reset {
        padding: 0;
        border: 0;
        border-bottom: 1px solid currentColor;
        background: transparent;
        color: var(--col-grey-60);
        cursor: pointer;
    }

    .shortcut {
        margin: 1.25rem 0 0;
        color: var(--col-grey-60);
        font-size: 0.75rem;
    }

    kbd {
        padding: 1px 5px;
        border: 1px solid var(--col-grey-40);
        background: var(--col-white);
        font-family: inherit;
    }
</style>
