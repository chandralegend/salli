/**
 * Turn an assistant reply into something worth listening to.
 *
 * Salli's replies are markdown — the same string `AssistantMarkdown` renders.
 * Handing that straight to a speech synthesiser makes it read the punctuation
 * aloud: "asterisk asterisk Rent asterisk asterisk", table pipes, hash marks
 * for headings. Voice Mode has been doing exactly that.
 *
 * This strips the syntax while keeping the words, and leaves a little
 * punctuation behind where it buys a natural pause.
 */
export function speakable(markdown: string): string {
  let text = markdown;

  // Fenced code blocks: unreadable aloud, and usually not meant for the ear.
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Links and images — keep the label, drop the URL.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Emphasis markers. Done before headings so `**## x**` degrades sensibly.
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, "$2");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // Headings become sentences so the synthesiser pauses after them.
  text = text.replace(/^#{1,6}\s*(.+)$/gm, "$1.");

  // Blockquotes and horizontal rules.
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/^\s*([-*_]\s*){3,}$/gm, " ");

  // Tables: drop the separator row, strip the outer pipes that would otherwise
  // become a leading and trailing comma, then turn the inner ones into pauses
  // so columns do not run together as one sentence.
  text = text.replace(/^\s*\|?[\s:|-]*\|[\s:|-]*\|?\s*$/gm, "");
  text = text.replace(/^\s*\|/gm, "");
  text = text.replace(/\|\s*$/gm, "");
  text = text.replace(/\s*\|\s*/g, ", ");

  // List markers — a bullet read aloud as "dash" adds nothing. Each item then
  // gets a full stop, or they run into one another as a single breathless
  // sentence once the newlines collapse below.
  text = text.replace(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/gm, (_m, item: string) => {
    const line = item.trim();
    return /[.,;:!?]$/.test(line) ? line : `${line}.`;
  });

  // Collapse whatever whitespace the above left behind.
  text = text.replace(/\n{2,}/g, ". ");
  text = text.replace(/\s+/g, " ");
  // ". ." and ", ," read as stumbles.
  text = text.replace(/([.,])\s*[.,]/g, "$1");

  return text.trim();
}
