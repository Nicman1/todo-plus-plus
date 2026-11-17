import { useEffect, useId, useRef, useState } from "react";
import type { Todo, UiPriority } from "../lib/types";
import { FormattedText } from "./FormattedText";
import { TodoEditPanel } from "./TodoEditPanel";
import {
	formatDue,
	formatDueShort,
	toDatetimeLocalValue,
} from "./todoFormat";

type Props = {
	todo: Todo;
	index: number;
	total: number;
	busy?: boolean;
	dragEnabled?: boolean;
	isDragging?: boolean;
	isDropTarget?: boolean;
	onToggle: () => void;
	onSaveText: (text: string) => void;
	onDelete: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onPriority: (p: UiPriority) => void;
	onDue: (offsetMinutes: number) => void;
	onBold: (start: number, end: number) => void;
	onFeedback?: (message: string, tone?: "info" | "error") => void;
	onDragStart?: (id: number) => void;
	onDragOver?: (id: number) => void;
	onDrop?: (id: number) => void;
	onDragEnd?: () => void;
};

const PRIORITY_LABELS: Record<string, string> = {
	unset: "Aucune",
	low: "Basse",
	normal: "Normale",
	high: "Haute",
};

export function TodoRow({
	todo,
	index,
	total,
	busy,
	dragEnabled = false,
	isDragging = false,
	isDropTarget = false,
	onToggle,
	onSaveText,
	onDelete,
	onMoveUp,
	onMoveDown,
	onPriority,
	onDue,
	onBold,
	onFeedback,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
}: Props) {
	const uid = useId();
	const titleId = `${uid}-title`;
	const panelId = `${uid}-edit`;
	const rowRef = useRef<HTMLLIElement>(null);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(todo.text);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [dueLocal, setDueLocal] = useState("");
	const [selection, setSelection] = useState<{
		start: number;
		end: number;
	} | null>(null);

	const dueLabel = formatDue(todo.dueAt);
	const dueShort = formatDueShort(todo.dueAt);
	const prioLabel = PRIORITY_LABELS[todo.priority] ?? todo.priority;
	const shortLabel =
		todo.text.length > 48 ? `${todo.text.slice(0, 48)}…` : todo.text;

	const initialDueLocal = toDatetimeLocalValue(todo.dueAt);

	const applyDueIfChanged = () => {
		if (!dueLocal || dueLocal === initialDueLocal) return true;
		const due = new Date(dueLocal);
		if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
			onFeedback?.(
				"Choisissez une date et une heure dans le futur.",
				"error",
			);
			return false;
		}
		onDue(Math.round((due.getTime() - Date.now()) / 60000));
		return true;
	};

	const startEditing = () => {
		setDraft(todo.text);
		setDueLocal(toDatetimeLocalValue(todo.dueAt));
		setSelection(null);
		setEditing(true);
		setConfirmDelete(false);
	};

	const cancelEditing = () => {
		setDraft(todo.text);
		setDueLocal(toDatetimeLocalValue(todo.dueAt));
		setSelection(null);
		setEditing(false);
	};

	const saveTextIfNeeded = () => {
		const next = draft.trim();
		if (!next) {
			onFeedback?.("Le texte de la tâche est requis.", "error");
			return false;
		}
		if (next !== todo.text) onSaveText(next);
		return true;
	};

	const saveAndClose = () => {
		if (!saveTextIfNeeded()) return;
		if (!applyDueIfChanged()) return;
		setEditing(false);
	};

	useEffect(() => {
		if (!editing) return;

		const onPointerDown = (event: PointerEvent) => {
			const row = rowRef.current;
			const target = event.target;
			if (!(target instanceof Node) || !row) return;
			if (row.contains(target)) return;
			const next = draft.trim();
			if (!next) {
				setDraft(todo.text);
				setDueLocal(toDatetimeLocalValue(todo.dueAt));
				setSelection(null);
				setEditing(false);
				return;
			}
			if (next !== todo.text) onSaveText(next);
			if (dueLocal && dueLocal !== toDatetimeLocalValue(todo.dueAt)) {
				const due = new Date(dueLocal);
				if (!Number.isNaN(due.getTime()) && due.getTime() > Date.now()) {
					onDue(Math.round((due.getTime() - Date.now()) / 60000));
				}
			}
			setEditing(false);
			setSelection(null);
		};

		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [editing, draft, dueLocal, todo.text, todo.dueAt, onSaveText, onDue]);

	const applyBold = (range?: { start: number; end: number } | null) => {
		const text = (editing ? draft : todo.text).trim() || todo.text;
		if (!text) return;
		if (editing && draft.trim() && draft.trim() !== todo.text) {
			onSaveText(draft.trim());
		}
		if (range && range.end >= range.start) {
			onBold(range.start, range.end);
			return;
		}
		onBold(1, text.length);
	};

	const canDrag = dragEnabled && !editing && !busy;

	const shouldBlockRowDrag = (target: EventTarget | null) => {
		if (!(target instanceof Element)) return false;
		return Boolean(
			target.closest(
				'.todo-actions, input.checkbox, select, textarea, .edit-panel, [contenteditable="true"]',
			),
		);
	};

	return (
		<li
			ref={rowRef}
			className={`todo-row${canDrag ? " is-draggable" : ""}${todo.completed ? " is-done" : ""}${editing ? " is-editing" : ""}${isDragging ? " is-dragging" : ""}${isDropTarget ? " is-drop-target" : ""}`}
			aria-busy={busy || undefined}
			aria-labelledby={titleId}
			draggable={canDrag}
			onDragStart={
				canDrag
					? (e) => {
							if (shouldBlockRowDrag(e.target)) {
								e.preventDefault();
								return;
							}
							e.dataTransfer.effectAllowed = "move";
							e.dataTransfer.setData("text/plain", String(todo.id));
							onDragStart?.(todo.id);
						}
					: undefined
			}
			onDragEnd={canDrag ? () => onDragEnd?.() : undefined}
			onDragOver={
				canDrag
					? (e) => {
							e.preventDefault();
							e.dataTransfer.dropEffect = "move";
							onDragOver?.(todo.id);
						}
					: undefined
			}
			onDrop={
				canDrag
					? (e) => {
							e.preventDefault();
							onDrop?.(todo.id);
						}
					: undefined
			}
		>
			<span
				className={canDrag ? "drag-handle" : "drag-handle-spacer"}
				aria-hidden="true"
				title={canDrag ? "Glisser la tâche pour réordonner" : undefined}
			>
				{canDrag ? "⋮⋮" : null}
			</span>
			<input
				className="checkbox"
				type="checkbox"
				checked={todo.completed}
				disabled={busy}
				aria-checked={todo.completed}
				aria-label={
					todo.completed
						? `Marquer comme à faire : ${shortLabel}`
						: `Marquer comme terminée : ${shortLabel}`
				}
				onChange={onToggle}
			/>

			<div className="todo-main">
				{editing ? (
					<TodoEditPanel
						idPrefix={uid}
						panelId={panelId}
						todo={todo}
						draft={draft}
						dueLocal={dueLocal}
						busy={busy}
						selection={selection}
						onDraftChange={setDraft}
						onDueLocalChange={setDueLocal}
						onSelectionChange={setSelection}
						onPriority={onPriority}
						onToggleBold={applyBold}
						onSave={saveAndClose}
						onCancel={cancelEditing}
					/>
				) : (
					<div className="todo-title" id={titleId}>
						<button
							type="button"
							className="todo-title-btn"
							aria-label={`Modifier : ${shortLabel}`}
							title={todo.text}
							onClick={startEditing}
						>
							<FormattedText text={todo.text} ranges={todo.boldRanges} />
						</button>
						{todo.priority !== "unset" ? (
							<span className="badge" data-prio={todo.priority}>
								<span className="badge-mark" aria-hidden="true" />
								{prioLabel}
							</span>
						) : null}
						{dueShort ? (
							<span
								className="badge badge-due"
								data-overdue={todo.overdue}
								title={dueLabel ?? undefined}
							>
								{todo.overdue ? "Retard · " : ""}
								{dueShort}
							</span>
						) : null}
						{todo.completed ? (
							<span className="visually-hidden"> (terminée)</span>
						) : null}
					</div>
				)}
			</div>

			{!editing ? (
				<div
					className="todo-actions"
					role="group"
					aria-label={`Actions : ${shortLabel}`}
				>
					<div className="todo-order">
						<button
							type="button"
							className="btn btn-ghost btn-icon"
							aria-label={`Monter « ${shortLabel} »`}
							disabled={busy || index === 0}
							onClick={onMoveUp}
						>
							<span aria-hidden="true">↑</span>
						</button>
						<button
							type="button"
							className="btn btn-ghost btn-icon"
							aria-label={`Descendre « ${shortLabel} »`}
							disabled={busy || index >= total - 1}
							onClick={onMoveDown}
						>
							<span aria-hidden="true">↓</span>
						</button>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-icon"
						disabled={busy}
						aria-expanded={false}
						aria-controls={panelId}
						aria-label={`Modifier « ${shortLabel} »`}
						title="Modifier"
						onClick={startEditing}
					>
						<span aria-hidden="true">✎</span>
					</button>
					{confirmDelete ? (
						<span
							className="inline-confirm"
							role="group"
							aria-label="Confirmer la suppression"
						>
							<button
								type="button"
								className="btn btn-danger btn-compact"
								disabled={busy}
								onClick={onDelete}
							>
								Oui
							</button>
							<button
								type="button"
								className="btn btn-ghost btn-compact"
								onClick={() => setConfirmDelete(false)}
							>
								Non
							</button>
						</span>
					) : (
						<button
							type="button"
							className="btn btn-ghost btn-icon"
							disabled={busy}
							aria-label={`Supprimer « ${shortLabel} »`}
							title="Supprimer"
							onClick={() => setConfirmDelete(true)}
						>
							<span aria-hidden="true">×</span>
						</button>
					)}
				</div>
			) : null}
		</li>
	);
}
