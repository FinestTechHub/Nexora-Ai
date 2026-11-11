"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Lets a page show its model selector inside the dashboard header. The page keeps all its own state.
export default function HeaderSlot({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => { setEl(document.getElementById("header-slot")); }, []);
  return el ? createPortal(children, el) : null;
}
