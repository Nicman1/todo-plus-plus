import { useId, useState } from "react";
import type { UiPriority } from "../lib/types";

type Props = {
	disabled?: boolean;
	onAdd: (
		text: string,
		meta: { priority: UiPriority; dueOffsetMinutes?: number },
	) => void | Promise<void>;
	onFeedback?: (message: string, tone?: "info" | "error") => void;
};

const PRIORITIES: { value: UiPriority; label: string }[] = [
	{ value: "unset", label: "Aucune" },
	{ value: "low", label: "Basse" },
	{ value: "normal", label: "Normale" },
	{ value: "high", label: "Haute" },
];

export function Composer({ disabled, onAdd, onFeedback }: Props) {
	const textId = useId();
	const optionsId = `${textId}-options`;
	const [text, setText] = useState("");
	const [open, setOpen] = useState(false);
	const [priority, setPriority] = useState<UiPriority>("unset");
	const [dueLocal, setDueLocal] = useState("");

	const submit = async () => {
		const value = text.trim();
		if (!value || disabled) return;
		let dueOffsetMinutes: number | undefined;
		if (dueLocal) {
			const due = new Date(dueLocal);
			if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
				onFeedback?.(
					"L’échéance doit être dans le futur. La tâche n’a pas été ajoutée.",
					"error",
				);
				return;
			}
			dueOffsetMinutes = Math.round((due.getTime() - Date.now()) / 60000);
		}
		await onAdd(value, { priority, dueOffsetMinutes });
		setText("");
		setDueLocal("");
		setPriority("unset");
	};

	return (
		<section className="composer" aria-label="Nouvelle tâche" aria-busy={disabled || undefined}>
			<label className="composer-label" htmlFor={textId}>
				Nouvelle tâche
			</label>
			<div className="composer-row">
				<input
					id={textId}
					type="text"
					value={text}
					disabled={disabled}
					placeholder="Écrire et Entrée…"
					autoComplete="off"
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void submit();
						}
					}}
				/>
				<button
					type="button"
					className="btn btn-accent"
					disabled={disabled || !text.trim()}
					onClick={() => void submit()}
				>
					{disabled ? "…" : "Ajouter"}
				</button>
			</div>
			<button
				type="button"
				className="btn btn-secondary btn-compact"
				aria-expanded={open}
				aria-controls={open ? optionsId : undefined}
				onClick={() => setOpen((v) => !v)}
			>
				{open ? "Moins d’options" : "Priorité / échéance"}
			</button>
			{open ? (
				<div className="composer-extra" id={optionsId}>
					<div>
						<label className="field-label" htmlFor={`${textId}-prio`}>
							Priorité
						</label>
						<select
							id={`${textId}-prio`}
							value={priority}
							disabled={disabled}
							onChange={(e) => setPriority(e.target.value as UiPriority)}
						>
							{PRIORITIES.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="field-label" htmlFor={`${textId}-due`}>
							Échéance
						</label>
						<input
							id={`${textId}-due`}
							type="datetime-local"
							value={dueLocal}
							disabled={disabled}
							onChange={(e) => setDueLocal(e.target.value)}
						/>
					</div>
				</div>
			) : null}
		</section>
	);
}
