import type { ReactNode } from "react";
import type { BoldRange } from "../lib/types";

type Props = {
	text: string;
	ranges: BoldRange[];
};

/** Renders plain text with SDK bold ranges (1-based inclusive). */
export function FormattedText({ text, ranges }: Props) {
	if (!ranges.length) return <>{text}</>;

	const marks = Array.from({ length: text.length }, () => false);
	for (const range of ranges) {
		const start = Math.max(1, range.start) - 1;
		const end = Math.min(text.length, range.end) - 1;
		for (let i = start; i <= end; i++) marks[i] = true;
	}

	const nodes: ReactNode[] = [];
	let i = 0;
	while (i < text.length) {
		const bold = marks[i];
		let j = i + 1;
		while (j < text.length && marks[j] === bold) j++;
		const slice = text.slice(i, j);
		nodes.push(
			bold ? (
				<strong key={i} className="bold">
					{slice}
				</strong>
			) : (
				<span key={i}>{slice}</span>
			),
		);
		i = j;
	}
	return <>{nodes}</>;
}
