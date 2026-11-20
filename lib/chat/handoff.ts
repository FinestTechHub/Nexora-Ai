// Carries what was typed or chosen on the Home screen over to the next page. Lives in memory only.
export type Handoff = {
  text: string; file: File | null;
  fill?: boolean;                       // put the text in the box instead of sending it
  model?: string;                       // chat model to select
  picker?: "image";                     // open the photo picker
  highlight?: "refs";                   // highlight the reference photo tray
  style?: string; aspect?: string;      // image studio presets
};
let pending: Handoff | null = null;
export const setHandoff = (h: Handoff) => { pending = h; };
export const takeHandoff = () => { const h = pending; pending = null; return h; };
