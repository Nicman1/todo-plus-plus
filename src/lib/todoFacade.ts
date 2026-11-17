/**
 * App integration layer for `todo-list-pro-plus-max`.
 * Persist and mutate only through the SDK; `viewCache` is a read-through projection.
 */
import * as sdk from "todo-list-pro-plus-max";
import type {
	BoldRange,
	ItemDetail,
	ItemSummary,
	Priority,
	Todo,
	UiPriority,
} from "./types";

export type { BoldRange, Priority, Todo, UiPriority } from "./types";

type Rgb = [number, number, number];

type SdkWithExtras = typeof sdk & {
	dismissTermsAlert(): void;
};

const todoSdk = sdk as SdkWithExtras;

/** Read-through projection cache, invalidated on SDK writes. */
const viewCache = new Map<number, Todo>();

function invalidateViewCache(id?: number): void {
	if (id == null) viewCache.clear();
	else viewCache.delete(id);
}

const PRIORITY_CENTROIDS: Record<Priority, Rgb> = {
	low: [156, 232, 156],
	normal: [155, 193, 232],
	high: [232, 157, 157],
	unset: [196, 159, 233],
};

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

export function formatLocalClock(date: Date = new Date()): string {
	return (
		`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
		`T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
	);
}

export function priorityFromRgb(rgb: Rgb): Priority {
	let best: Priority = "unset";
	let bestDist = Infinity;
	for (const label of Object.keys(PRIORITY_CENTROIDS) as Priority[]) {
		const [cr, cg, cb] = PRIORITY_CENTROIDS[label];
		const d = (rgb[0] - cr) ** 2 + (rgb[1] - cg) ** 2 + (rgb[2] - cb) ** 2;
		if (d < bestDist) {
			bestDist = d;
			best = label;
		}
	}
	return best;
}

function deriveOverdue(dueAt: string | null): boolean {
	if (dueAt == null || dueAt === "") return false;
	const ms = Date.parse(dueAt);
	if (Number.isNaN(ms)) return false;
	return ms < Date.now();
}

function asSummaries(items: ReturnType<typeof sdk.getItems>): ItemSummary[] {
	return items as unknown as ItemSummary[];
}

function asDetail(item: unknown): ItemDetail | undefined {
	if (!item || typeof item !== "object") return undefined;
	const o = item as Record<string, unknown>;
	if (typeof o.key !== "number" || typeof o.value !== "string") return undefined;
	return {
		key: o.key,
		value: o.value,
		isComplete: Boolean(o.isComplete),
		shade: Array.isArray(o.shade) ? (o.shade as Rgb) : [0, 0, 0],
		previous: (o.previous as number | null) ?? null,
	};
}

/** Builds display order from the `previousId` chain (getItems array order is unreliable). */
function orderedSummaries(): ItemSummary[] {
	const items = asSummaries(sdk.getItems());
	if (items.length === 0) return [];

	const byPrev = new Map<number | null, ItemSummary>();
	for (const item of items) {
		byPrev.set(item.previousId, item);
	}

	const ordered: ItemSummary[] = [];
	const seen = new Set<number>();
	let current: ItemSummary | undefined = byPrev.get(null);

	while (current && !seen.has(current.id)) {
		ordered.push(current);
		seen.add(current.id);
		current = byPrev.get(current.id);
	}

	for (const item of items) {
		if (!seen.has(item.id)) ordered.push(item);
	}
	return ordered;
}

function mapUiPriority(priority: UiPriority): Priority {
	return priority === "urgent" ? "high" : priority;
}

function readMeta(id: number): Pick<Todo, "priority" | "dueAt" | "boldRanges"> {
	let priority: Priority = "unset";
	try {
		priority = priorityFromRgb(sdk.getPriority(id) as Rgb);
	} catch {
		priority = "unset";
	}
	let dueAt: string | null = null;
	try {
		const dueRaw = sdk.getDueDate(id);
		dueAt = dueRaw == null || dueRaw === "" ? null : String(dueRaw);
	} catch {
		dueAt = null;
	}
	let boldRanges: BoldRange[] = [];
	try {
		boldRanges = (sdk.getBoldText(id) as BoldRange[]) ?? [];
	} catch {
		boldRanges = [];
	}
	return { priority, dueAt, boldRanges };
}

function todoFromDetail(detail: ItemDetail, meta?: ReturnType<typeof readMeta>): Todo {
	const m = meta ?? readMeta(detail.key);
	return {
		id: detail.key,
		text: detail.value,
		completed: Boolean(detail.isComplete),
		priority: m.priority,
		dueAt: m.dueAt,
		overdue: deriveOverdue(m.dueAt),
		boldRanges: m.boldRanges,
	};
}

export function enrichTodo(id: number, opts?: { bypassCache?: boolean }): Todo {
	if (!opts?.bypassCache) {
		const cached = viewCache.get(id);
		if (cached) {
			return { ...cached, overdue: deriveOverdue(cached.dueAt) };
		}
	}

	const detail = asDetail(sdk.getItem(id));
	if (!detail) {
		invalidateViewCache(id);
		throw new Error(`Todo ${id} not found`);
	}

	const todo = todoFromDetail(detail);
	viewCache.set(id, todo);
	return todo;
}

export function bootstrap(): void {
	const now = new Date();
	sdk.setClock(formatLocalClock(now), -now.getTimezoneOffset());
	try {
		todoSdk.dismissTermsAlert();
	} catch {
		/* ignored */
	}
}

export function listTodos(): Todo[] {
	const rows = orderedSummaries();
	const liveIds = new Set(rows.map((r) => r.id));
	for (const cachedId of [...viewCache.keys()]) {
		if (!liveIds.has(cachedId)) viewCache.delete(cachedId);
	}
	return rows.map((item) => enrichTodo(item.id));
}

export function searchTodos(query: string): Todo[] {
	const q = query.trim();
	if (q === "") return listTodos();
	return asSummaries(sdk.searchItems(q)).map((item) => enrichTodo(item.id));
}

export function addTodo(text: string, at?: number): Todo {
	const trimmed = text.trim();
	if (!trimmed) throw new Error("Le texte de la tâche est requis.");
	const index = at ?? orderedSummaries().length;
	const { id } = sdk.insertItem(trimmed, { at: index });
	invalidateViewCache();
	return enrichTodo(id, { bypassCache: true });
}

export function updateTodoText(id: number, text: string): Todo {
	const trimmed = text.trim();
	if (!trimmed) throw new Error("Le texte de la tâche est requis.");
	let lastError: unknown;
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const prev = viewCache.get(id);
			const detail = asDetail(sdk.updateItem(id, trimmed));
			if (detail) {
				const meta = readMeta(id);
				const todo = todoFromDetail(detail, {
					priority: prev?.priority ?? meta.priority,
					dueAt: prev?.dueAt ?? meta.dueAt,
					boldRanges: meta.boldRanges,
				});
				viewCache.set(id, todo);
				return todo;
			}
			invalidateViewCache(id);
			return enrichTodo(id, { bypassCache: true });
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError;
}

export function toggleTodo(id: number): Todo {
	const prev = viewCache.get(id);
	const detail = asDetail(sdk.toggleItem(id));
	if (detail) {
		const todo = todoFromDetail(
			detail,
			prev
				? {
						priority: prev.priority,
						dueAt: prev.dueAt,
						boldRanges: prev.boldRanges,
					}
				: undefined,
		);
		viewCache.set(id, todo);
		return todo;
	}
	invalidateViewCache(id);
	return enrichTodo(id, { bypassCache: true });
}

export function deleteTodo(id: number): void {
	sdk.deleteItem(id);
	invalidateViewCache(id);
}

export function moveTodo(id: number, toIndex: number): void {
	const ids = orderedSummaries().map((item) => item.id);
	const fromIndex = ids.indexOf(id);
	if (fromIndex < 0) throw new Error(`Todo ${id} not found`);

	const permutation = [...ids];
	permutation.splice(fromIndex, 1);
	const clamped = Math.max(0, Math.min(toIndex, permutation.length));
	permutation.splice(clamped, 0, id);
	sdk.reorderItems(permutation);
	invalidateViewCache();
}

export function setTodoPriority(id: number, priority: UiPriority): void {
	sdk.setPriority(id, mapUiPriority(priority) as Parameters<typeof sdk.setPriority>[1]);
	invalidateViewCache(id);
}

export function setTodoDue(id: number, offsetMinutes: number | null): void {
	if (offsetMinutes == null) {
		throw new Error(
			"Clearing due dates is not supported by the SDK (offset must be a finite number of minutes).",
		);
	}
	const now = new Date();
	sdk.setClock(formatLocalClock(now), -now.getTimezoneOffset());
	sdk.setDueDate(id, offsetMinutes);
	invalidateViewCache(id);
}

export function toggleTodoBold(
	id: number,
	start: number,
	end: number,
): BoldRange[] {
	const ranges = sdk.toggleBoldText(id, start, end) as BoldRange[];
	invalidateViewCache(id);
	return ranges;
}

/** Times a full list projection (debug / perf checks). */
export function measureListProjection(): {
	count: number;
	ms: number;
	cacheHits: number;
} {
	const before = viewCache.size;
	const t0 = performance.now();
	const list = listTodos();
	const ms = performance.now() - t0;
	return { count: list.length, ms, cacheHits: before };
}
