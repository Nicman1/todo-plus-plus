import type { Todo, UiPriority } from "../lib/types";
import { formatDue } from "./todoFormat";
import { RichTitleEditor } from "./RichTitleEditor";

const PRIORITIES: { value: UiPriority; label: string }[] = [
	{ value: "unset", label: "Aucune" },
	{ value: "low", label: "Basse" },
	{ value: "normal", label: "Normale" },
	{ value: "high", label: "Haute" },
];

type Props = {
	idPrefix: string;
	panelId: string;
	todo: Todo;
	draft: string;
	dueLocal: string;
	busy?: boolean;
	selection: { start: number; end: number } | null;
	onDraftChange: (text: string) => void;
	onDueLocalChange: (value: string) => void;
	onSelectionChange: (range: { start: number; end: number } | null) => void;
	onPriority: (p: UiPriority) => void;
	onToggleBold: (range?: { start: number; end: number } | null) => void;
	onSave: () => void;
	onCancel: () => void;
};

export function TodoEditPanel({
	idPrefix,
	panelId,
	todo,
	draft,
	dueLocal,
	busy,
	selection,
	onDraftChange,
	onDueLocalChange,
	onSelectionChange,
	onPriority,
	onToggleBold,
	onSave,
	onCancel,
}: Props) {
	const dueLabel = formatDue(todo.dueAt);
	const isFullyBold =
		todo.text.length > 0 &&
		todo.boldRanges.some((r) => r.start <= 1 && r.end >= todo.text.length);

	return (
		<div className="edit-panel" id={panelId}>
			<label className="field-label" htmlFor={`${idPrefix}-text`}>
				Texte
			</label>
			<div className="edit-strip">
				<RichTitleEditor
					id={`${idPrefix}-text`}
					text={draft}
					boldRanges={draft === todo.text ? todo.boldRanges : []}
					disabled={busy}
					onTextChange={onDraftChange}
					onSelectionChange={onSelectionChange}
					onSubmit={onSave}
					onCancel={onCancel}
					onToggleBold={(range) => onToggleBold(range)}
				/>
				<button
					type="button"
					className="btn btn-secondary btn-compact"
					disabled={busy}
					aria-pressed={isFullyBold}
					title="Ctrl+B — sélection ou tout le titre"
					onClick={() => onToggleBold(selection)}
				>
					Gras
				</button>
			</div>
			<div className="todo-expand">
				<div>
					<label className="field-label" htmlFor={`${idPrefix}-prio`}>
						Priorité
					</label>
					<select
						id={`${idPrefix}-prio`}
						value={todo.priority}
						disabled={busy}
						onChange={(e) => onPriority(e.target.value as UiPriority)}
					>
						{PRIORITIES.map((p) => (
							<option key={p.value} value={p.value}>
								{p.label}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="field-label" htmlFor={`${idPrefix}-due`}>
						Échéance
						{dueLabel ? (
							<span className="field-hint"> · actuelle : {dueLabel}</span>
						) : (
							<span className="field-hint"> · future</span>
						)}
					</label>
					<input
						id={`${idPrefix}-due`}
						type="datetime-local"
						value={dueLocal}
						disabled={busy}
						onChange={(e) => onDueLocalChange(e.target.value)}
					/>
				</div>
			</div>
			<div className="edit-actions">
				<button
					type="button"
					className="btn btn-accent btn-compact"
					disabled={busy}
					onClick={onSave}
				>
					Enregistrer
				</button>
				<button
					type="button"
					className="btn btn-secondary btn-compact"
					disabled={busy}
					onClick={onCancel}
				>
					Annuler
				</button>
			</div>
		</div>
	);
}
