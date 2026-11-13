// Carries a message (and attachment) typed on the Home screen over to the Chat page. Lives in memory only.
let pending: { text: string; file: File | null } | null = null;
export const setHandoff = (h: { text: string; file: File | null }) => { pending = h; };
export const takeHandoff = () => { const h = pending; pending = null; return h; };
