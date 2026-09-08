<script lang="ts">
  export let large = false;
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';
</script>

<button on:click {type} class={large ? 'large' : ''} {disabled}><slot /></button>

<style lang="scss">
  button {
    box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
    color: var(--col-grey-70);
    border: 1px solid var(--col-grey-70);
    background: var(--col-grey-40);
    font-size: 1.1rem;
    border-radius: 0;

    &.large {
      font-size: 1.6rem;
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
