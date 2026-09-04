export const initializeIdentifyPanelClose = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const closeButton = target.closest("[data-close-identify-panel]");
    if (!closeButton) {
      return;
    }

    const panelContainer = closeButton.closest("#identify-panel, #collection-identify-panel");
    if (panelContainer instanceof HTMLElement) {
      panelContainer.innerHTML = "";
    }
  });
};
