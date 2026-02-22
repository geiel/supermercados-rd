export const PRODUCT_SCROLL_PEEK_PROPS = {
  // 40% peek of the next card at each breakpoint.
  // Formula: (container - (visibleGaps * gap)) / (fullCards + 0.5)
  // Mobile/sm use a tighter 6px gap. md+ use 8px gap.
  itemWidth: "calc((100cqw - (2 * 6px)) / 2.5)",
  itemWidthSm: "calc((100cqw - (2 * 6px)) / 2.5)",
  itemWidthMd: "calc((100cqw - (5 * 8px)) / 5.5)",
  itemWidthLg: "calc((100cqw - (6 * 8px)) / 6.5)",
  itemWidthXl: "calc((100cqw - (7 * 8px)) / 7.5)",
} as const;

export const RELATED_PRODUCTS_SCROLL_PEEK_PROPS = {
  // Related products render inside a narrower column on large screens,
  // so use fewer full cards to avoid tiny product tiles.
  itemWidth: "calc((100cqw - (2 * 6px)) / 2.5)",
  itemWidthSm: "calc((100cqw - (2 * 6px)) / 2.5)",
  itemWidthMd: "calc((100cqw - (3 * 8px)) / 3.5)",
  itemWidthLg: "calc((100cqw - (4 * 8px)) / 4.5)",
  itemWidthXl: "calc((100cqw - (4 * 8px)) / 4.5)",
} as const;
