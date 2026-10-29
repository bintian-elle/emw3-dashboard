/**
 * Shared visual recipe for Nova menu surfaces.
 *
 * Select and Dropdown intentionally keep their distinct React Aria semantics
 * (single-value listbox vs. action menu), while consuming the same panel,
 * motion, and row treatments from here.
 */
export const MENU_POPOVER_SURFACE = [
  "max-w-[calc(100vw-32px)] overflow-y-auto",
  "z-50 rounded-lg border border-border-button-default bg-background-primary-default p-1 shadow-lg",
  "transition duration-150 ease-out motion-reduce:transition-none",
  "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
  "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
  "data-[placement=bottom]:origin-top-left data-[placement=top]:origin-bottom-left",
  "data-[placement=left]:origin-right data-[placement=right]:origin-left",
].join(" ");

export const MENU_POPOVER_WIDTH = "w-[266px]";

export const MENU_ITEMS_CONTAINER = "flex w-full flex-col gap-1 outline-none";

export const MENU_ITEM = [
  "flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm",
  "text-text-primary outline-none transition-colors",
].join(" ");

export const MENU_ITEM_ACTIVE = "bg-background-secondary-default";

export const MENU_ITEM_INTERACTIVE =
  "hover:bg-background-secondary-default focus-visible:bg-background-secondary-default";
