import { useEffect, useRef } from "react";
import type { BoldRange } from "../lib/types";

type Props = {
	id?: string;
	text: string;
	boldRanges: BoldRange[];
	disabled?: boolean;
	onTextChange: (text: string) => void;
	onSelectionChange: (range: { start: number; end: number } | null) => void;
	onSubmit: () => void;
	onCancel: () => void;
	onToggleBold: (range: { start: number; end: number } | null) => void;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function textToBoldHtml(text: string, ranges: BoldRange[]): string {
	if (!text) return "";
	const marks = Array.from({ length: text.length }, () => false);
	for (const range of ranges) {
		const start = Math.max(1, range.start) - 1;
		const end = Math.min(text.length, range.end) - 1;
		for (let i = start; i <= end; i++) marks[i] = true;
	}

	let html = "";
	let i = 0;
	while (i < text.length) {
		const bold = marks[i];
		let j = i + 1;
		while (j < text.length && marks[j] === bold) j++;
		const slice = escapeHtml(text.slice(i, j));
		html += bold ? `<strong>${slice}</strong>` : slice;
		i = j;
	}
	return html;
}

function plainOffsetInRoot(root: HTMLElement, node: Node, offset: number): number {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let total = 0;
	let current = walker.nextNode();
	while (current) {
		if (current === node) return total + offset;
		total += current.textContent?.length ?? 0;
		current = walker.nextNode();
	}
	return total;
}

/**
 * Selection offsets for the SDK bold API (1-based inclusive).
 * DOM Selection offsets are 0-based with an exclusive end.
 */
function readSelection(root: HTMLElement): { start: number; end: number } | null {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return null;
	if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null;

	const a = plainOffsetInRoot(root, sel.anchorNode!, sel.anchorOffset);
	const b = plainOffsetInRoot(root, sel.focusNode!, sel.focusOffset);
	const start0 = Math.min(a, b);
	const end0 = Math.max(a, b);
	if (end0 <= start0) return null;
	return { start: start0 + 1, end: end0 };
}

export function RichTitleEditor({
	id,
	text,
	boldRanges,
	disabled,
	onTextChange,
	onSelectionChange,
	onSubmit,
	onCancel,
	onToggleBold,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const skipNextSync = useRef(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (skipNextSync.current) {
			skipNextSync.current = false;
			return;
		}
		const next = textToBoldHtml(text, boldRanges);
		if (el.innerHTML !== next) el.innerHTML = next || "";
	}, [text, boldRanges]);

	useEffect(() => {
		ref.current?.focus();
	}, []);

	const emitSelection = () => {
		const el = ref.current;
		if (!el) return;
		onSelectionChange(readSelection(el));
	};

	return (
		<div
			id={id}
			ref={ref}
			className="rich-title-editor"
			contentEditable={!disabled}
			role="textbox"
			aria-multiline="false"
			suppressContentEditableWarning
			onInput={() => {
				const el = ref.current;
				if (!el) return;
				skipNextSync.current = true;
				onTextChange(el.textContent ?? "");
				emitSelection();
			}}
			onKeyUp={emitSelection}
			onMouseUp={emitSelection}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					onSubmit();
				}
				if (e.key === "Escape") {
					e.preventDefault();
					onCancel();
				}
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
					e.preventDefault();
					const el = ref.current;
					onToggleBold(el ? readSelection(el) : null);
				}
			}}
		/>
	);
}
