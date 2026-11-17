import {
	startTransition,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import * as facade from "../lib/todoFacade";
import type { Todo, UiPriority } from "../lib/types";

type Status = { tone: "info" | "error"; message: string } | null;
type RefreshMode = "list" | "item";

export function useTodos() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [status, setStatus] = useState<Status>(null);
	const [busyIds, setBusyIds] = useState<Set<number>>(() => new Set());
	const [creating, setCreating] = useState(false);
	const announceRef = useRef<(msg: string) => void>(() => {});
	const bootstrapped = useRef(false);
	const statusTimerRef = useRef<number | null>(null);
	const debouncedQueryRef = useRef(debouncedQuery);

	const clearStatusTimer = () => {
		if (statusTimerRef.current != null) {
			window.clearTimeout(statusTimerRef.current);
			statusTimerRef.current = null;
		}
	};

	const showStatus = useCallback(
		(message: string, tone: "info" | "error" = "info") => {
			clearStatusTimer();
			setStatus({ tone, message });
			announceRef.current(message);
			const ms = tone === "error" ? 4500 : 2400;
			statusTimerRef.current = window.setTimeout(() => {
				setStatus(null);
				statusTimerRef.current = null;
			}, ms);
		},
		[],
	);

	useEffect(() => () => clearStatusTimer(), []);

	useEffect(() => {
		debouncedQueryRef.current = debouncedQuery;
	}, [debouncedQuery]);

	const setBusy = (id: number, on: boolean) => {
		setBusyIds((prev) => {
			const next = new Set(prev);
			if (on) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const refreshList = useCallback((q: string) => {
		const next = facade.searchTodos(q);
		startTransition(() => {
			setTodos(next);
		});
	}, []);

	const refreshItem = useCallback((id: number) => {
		const updated = facade.enrichTodo(id, { bypassCache: true });
		startTransition(() => {
			setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
		});
	}, []);

	useEffect(() => {
		if (!bootstrapped.current) {
			facade.bootstrap();
			bootstrapped.current = true;
		}
		const next = facade.searchTodos(debouncedQuery);
		startTransition(() => {
			setTodos(next);
		});
		if (debouncedQuery.trim()) {
			const msg =
				next.length === 0
					? "Aucun résultat pour cette recherche."
					: `${next.length} résultat${next.length > 1 ? "s" : ""} trouvé${next.length > 1 ? "s" : ""}.`;
			announceRef.current(msg);
		}
	}, [debouncedQuery]);

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedQuery(query), 200);
		return () => window.clearTimeout(t);
	}, [query]);

	const announce = useCallback(
		(message: string) => {
			showStatus(message, "info");
		},
		[showStatus],
	);

	const fail = useCallback(
		(err: unknown) => {
			const message =
				err instanceof Error ? err.message : "Une erreur est survenue.";
			showStatus(message, "error");
		},
		[showStatus],
	);

	const run = useCallback(
		(
			id: number | null,
			action: () => void,
			okMessage: string,
			mode: RefreshMode = "list",
		) => {
			if (id != null) setBusy(id, true);
			else setCreating(true);
			try {
				action();
				if (mode === "item" && id != null) refreshItem(id);
				else refreshList(debouncedQueryRef.current);
				announce(okMessage);
			} catch (err) {
				fail(err);
				refreshList(debouncedQueryRef.current);
			} finally {
				if (id != null) setBusy(id, false);
				else setCreating(false);
			}
		},
		[announce, fail, refreshItem, refreshList],
	);

	const setStatusMessage = useCallback(
		(message: string, tone: "info" | "error" = "info") => {
			showStatus(message, tone);
		},
		[showStatus],
	);

	return {
		todos,
		query,
		setQuery,
		status,
		setStatusMessage,
		clearStatus: () => {
			clearStatusTimer();
			setStatus(null);
		},
		busyIds,
		creating,
		announceRef,
		refresh: () => refreshList(debouncedQueryRef.current),
		addTodo: (
			text: string,
			meta?: { priority?: UiPriority; dueOffsetMinutes?: number },
		) =>
			run(
				null,
				() => {
					const todo = facade.addTodo(text);
					if (meta?.priority && meta.priority !== "unset") {
						facade.setTodoPriority(todo.id, meta.priority);
					}
					if (
						meta?.dueOffsetMinutes != null &&
						meta.dueOffsetMinutes > 0
					) {
						facade.setTodoDue(todo.id, meta.dueOffsetMinutes);
					}
				},
				"Tâche ajoutée.",
			),
		updateText: (id: number, text: string) =>
			run(
				id,
				() => {
					facade.updateTodoText(id, text);
				},
				"Tâche modifiée.",
				"item",
			),
		toggle: (id: number) =>
			run(
				id,
				() => {
					facade.toggleTodo(id);
				},
				"État mis à jour.",
				"item",
			),
		remove: (id: number) =>
			run(
				id,
				() => {
					facade.deleteTodo(id);
				},
				"Tâche supprimée.",
			),
		move: (id: number, toIndex: number) =>
			run(
				id,
				() => {
					facade.moveTodo(id, toIndex);
				},
				"Ordre mis à jour.",
			),
		setPriority: (id: number, priority: UiPriority) =>
			run(
				id,
				() => {
					facade.setTodoPriority(id, priority);
				},
				"Priorité mise à jour.",
				"item",
			),
		setDue: (id: number, offsetMinutes: number) =>
			run(
				id,
				() => {
					facade.setTodoDue(id, offsetMinutes);
				},
				"Échéance mise à jour.",
				"item",
			),
		toggleBold: (id: number, start: number, end: number) =>
			run(
				id,
				() => {
					facade.toggleTodoBold(id, start, end);
				},
				"Mise en forme mise à jour.",
				"item",
			),
	};
}
