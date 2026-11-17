/** Shared due-date formatting helpers. */

export function formatDue(dueAt: string | null): string | null {
	if (!dueAt) return null;
	const d = new Date(dueAt);
	if (Number.isNaN(d.getTime())) return dueAt;
	return d.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

export function formatDueShort(dueAt: string | null): string | null {
	if (!dueAt) return null;
	const d = new Date(dueAt);
	if (Number.isNaN(d.getTime())) return dueAt;
	return d.toLocaleString(undefined, {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** Value format expected by `<input type="datetime-local">`. */
export function toDatetimeLocalValue(dueAt: string | null): string {
	if (!dueAt) return "";
	const d = new Date(dueAt);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
