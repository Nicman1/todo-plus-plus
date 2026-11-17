/** Priority labels accepted by `setPriority`. */
export type Priority = "low" | "normal" | "high" | "unset";

/** UI priority; `urgent` is mapped to `high` before calling the SDK. */
export type UiPriority = Priority | "urgent";

export type BoldRange = {
	start: number;
	end: number;
};

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
	/** Derived from `getPriority` RGB centroids (values jitter). */
	priority: Priority;
	/** Raw `getDueDate` string, or null when unset. */
	dueAt: string | null;
	/** `dueAt < now`; SDK does not export `isOverdue`. */
	overdue: boolean;
	boldRanges: BoldRange[];
};

/** Runtime shape of `getItems` / `searchItems` / `reorderItems`. */
export type ItemSummary = {
	id: number;
	text: string;
	color: [number, number, number];
	previousId: number | null;
};

/** Runtime shape of `getItem` / `updateItem` / `toggleItem`. */
export type ItemDetail = {
	key: number;
	value: string;
	isComplete: boolean;
	shade: [number, number, number];
	previous: number | null;
};
