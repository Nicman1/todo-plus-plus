import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "./components/Composer";
import { TodoRow } from "./components/TodoRow";
import { useTodos } from "./hooks/useTodos";

type Filter = "all" | "open" | "done";

function App() {
	const {
		todos,
		query,
		setQuery,
		status,
		setStatusMessage,
		clearStatus,
		busyIds,
		creating,
		announceRef,
		addTodo,
		updateText,
		toggle,
		remove,
		move,
		setPriority,
		setDue,
		toggleBold,
	} = useTodos();

	const [liveMessage, setLiveMessage] = useState("");
	const [filter, setFilter] = useState<Filter>("all");
	const [draggingId, setDraggingId] = useState<number | null>(null);
	const [dropTargetId, setDropTargetId] = useState<number | null>(null);
	const [composerAway, setComposerAway] = useState(false);
	const composerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		announceRef.current = (msg: string) => setLiveMessage(msg);
	}, [announceRef]);

	useEffect(() => {
		const el = composerRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				setComposerAway(!entry.isIntersecting);
			},
			{ threshold: 0 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	const dragEnabled = filter === "all" && !query.trim();

	const openCount = useMemo(
		() => todos.filter((t) => !t.completed).length,
		[todos],
	);
	const doneCount = todos.length - openCount;

	const visible = useMemo(() => {
		if (filter === "open") return todos.filter((t) => !t.completed);
		if (filter === "done") return todos.filter((t) => t.completed);
		return todos;
	}, [todos, filter]);

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div className="app">
			<div className="live-region" role="status" aria-live="polite" aria-atomic="true">
				{liveMessage}
			</div>

			<header className="topbar">
				<h1 className="brand">
					TODO<span>++</span>
				</h1>
				<div className="stats" aria-label="Résumé">
					<span className="stat">
						<strong>{openCount}</strong> ouvertes
					</span>
					<span className="stat">
						<strong>{doneCount}</strong> terminées
					</span>
				</div>
			</header>

			{status ? (
				<div
					className="toast"
					data-tone={status.tone}
					role={status.tone === "error" ? "alert" : "status"}
				>
					<span>{status.message}</span>
					<button
						type="button"
						className="btn btn-ghost toast-close"
						aria-label="Fermer la notification"
						onClick={clearStatus}
					>
						×
					</button>
				</div>
			) : null}

			<div
				className={`chrome-pin${composerAway ? " is-stuck" : ""}`}
				role="search"
				aria-label="Filtres et recherche"
			>
				<div className="chrome-row">
					<div className="filters" role="group" aria-label="Filtrer la liste">
						{(
							[
								["all", "Toutes"],
								["open", "Ouvertes"],
								["done", "Terminées"],
							] as const
						).map(([value, label]) => (
							<button
								key={value}
								type="button"
								className="filter-btn"
								aria-pressed={filter === value}
								onClick={() => setFilter(value)}
							>
								{label}
							</button>
						))}
					</div>

					<label className="visually-hidden" htmlFor="todo-search">
						Rechercher
					</label>
					<input
						id="todo-search"
						className="chrome-search"
						type="search"
						value={query}
						placeholder="Rechercher…"
						onChange={(e) => setQuery(e.target.value)}
						autoComplete="off"
						enterKeyHint="search"
					/>
					{query ? (
						<button
							type="button"
							className="btn btn-secondary btn-compact"
							onClick={() => setQuery("")}
						>
							Effacer
						</button>
					) : null}
				</div>
			</div>

			<section
				className="composer-slot"
				ref={composerRef}
				aria-label="Nouvelle tâche"
			>
				<Composer
					disabled={creating}
					onAdd={addTodo}
					onFeedback={(message, tone = "info") =>
						setStatusMessage(message, tone)
					}
				/>
			</section>

			<main id="main" tabIndex={-1}>
				{visible.length === 0 ? (
					<p className="empty" role="status">
						{query.trim()
							? "Aucun résultat."
							: filter === "done"
								? "Aucune tâche terminée."
								: filter === "open"
									? "Rien d’ouvert — belle avance."
									: "Ajoute ta première tâche ci-dessus."}
					</p>
				) : (
					<ul className="todo-list" aria-label="Liste des tâches">
						{visible.map((todo) => {
							const index = todos.findIndex((t) => t.id === todo.id);
							return (
								<TodoRow
									key={todo.id}
									todo={todo}
									index={index}
									total={todos.length}
									busy={busyIds.has(todo.id)}
									dragEnabled={dragEnabled}
									isDragging={draggingId === todo.id}
									isDropTarget={
										dropTargetId === todo.id && draggingId !== todo.id
									}
									onToggle={() => void toggle(todo.id)}
									onSaveText={(text) => void updateText(todo.id, text)}
									onDelete={() => void remove(todo.id)}
									onMoveUp={() => void move(todo.id, index - 1)}
									onMoveDown={() => void move(todo.id, index + 1)}
									onPriority={(p) => void setPriority(todo.id, p)}
									onDue={(mins) => void setDue(todo.id, mins)}
									onBold={(start, end) => void toggleBold(todo.id, start, end)}
									onFeedback={(message, tone = "info") =>
										setStatusMessage(message, tone)
									}
									onDragStart={(id) => {
										setDraggingId(id);
										setDropTargetId(null);
									}}
									onDragOver={(id) => {
										if (id !== draggingId) setDropTargetId(id);
									}}
									onDrop={(targetId) => {
										if (draggingId == null || draggingId === targetId) {
											setDraggingId(null);
											setDropTargetId(null);
											return;
										}
										const to = todos.findIndex((t) => t.id === targetId);
										if (to >= 0) void move(draggingId, to);
										setDraggingId(null);
										setDropTargetId(null);
									}}
									onDragEnd={() => {
										setDraggingId(null);
										setDropTargetId(null);
									}}
								/>
							);
						})}
					</ul>
				)}
			</main>

			{composerAway ? (
				<button
					type="button"
					className="back-top"
					aria-label="Revenir en haut"
					title="Revenir en haut"
					onClick={scrollToTop}
				>
					↑
				</button>
			) : null}
		</div>
	);
}

export default App;
