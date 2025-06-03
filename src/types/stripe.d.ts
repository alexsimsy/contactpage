declare global {
  interface HTMLElementTagNameMap {
    'stripe-pricing-table': HTMLElement & {
      setAttribute(name: string, value: string): void;
    };
  }
}

export {}; 