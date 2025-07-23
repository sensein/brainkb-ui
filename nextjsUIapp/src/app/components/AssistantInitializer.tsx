"use client";

import { useEffect } from "react";

export default function AssistantInitializer() {
  useEffect(() => {
    // 1. Inject the `.assistant` CSS dynamically
    const style = document.createElement("style");
    style.textContent = `
      .assistant {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        z-index: 999999999999 !important;
        width: 600px;
        height: auto;
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);

    // 2. Function to remove inline style + force override
    const fixAssistantStyles = () => {
      document.querySelectorAll(".brainkb-assistant-container").forEach(el => {
        el.removeAttribute("style");
      });

      const assistant = document.querySelector(".assistant") as HTMLElement | null;
      if (assistant) {
        assistant.style.position = "fixed";
        assistant.style.bottom = "24px";
        assistant.style.right = "24px";
        assistant.style.zIndex = "999999";
        assistant.style.width = "600px";
        assistant.style.pointerEvents = "auto";
      }
    };

    // 3. MutationObserver to watch for dynamic loads
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const element = node as HTMLElement;
            if (
              element.matches(".brainkb-assistant-container") ||
              element.querySelector(".brainkb-assistant-container")
            ) {
              fixAssistantStyles();
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run
    fixAssistantStyles();

    return () => observer.disconnect();
  }, []);

  return null;
}
