export const initializeItemEditForm = () => {
  const form = document.getElementById("item-edit-form");
  const aliasRows = document.getElementById("alias-rows");
  const aliasTemplate = document.getElementById("alias-row-template");
  const addAliasButton = document.getElementById("add-alias-row");
  const historyRemovalCount = document.getElementById("history-removal-count");
  const aliasRemovalCount = document.getElementById("alias-removal-count");
  const openDeleteButton = document.getElementById("open-delete-item-confirm");
  const deleteDialog = document.getElementById("delete-item-dialog");
  const cancelDeleteButton = document.getElementById("cancel-delete-item");
  const deleteItemForm = document.getElementById("delete-item-form");
  const deleteConfirmInput = document.getElementById("delete-item-confirm-input");
  const deleteConfirmError = document.getElementById("delete-item-confirm-error");

  if (
    !form
    || !aliasRows
    || !aliasTemplate
    || !addAliasButton
    || !historyRemovalCount
    || !aliasRemovalCount
  ) {
    return;
  }

  let aliasIndex = aliasRows.querySelectorAll("[data-alias-row]").length;

  const updateSummary = () => {
    const historyChecked = form.querySelectorAll("[data-history-checkbox]:checked").length;
    const aliasChecked = form.querySelectorAll("[data-alias-remove-checkbox]:checked").length;
    historyRemovalCount.textContent = String(historyChecked);
    aliasRemovalCount.textContent = String(aliasChecked);
  };

  addAliasButton.addEventListener("click", () => {
    const fragment = aliasTemplate.content.cloneNode(true);
    const rowKey = `new-${String(aliasIndex)}`;
    aliasIndex += 1;

    const rowKeyInput = fragment.querySelector("[data-alias-row-key]");
    if (rowKeyInput instanceof HTMLInputElement) {
      rowKeyInput.value = rowKey;
    }

    const removeCheckbox = fragment.querySelector("[data-alias-remove-checkbox]");
    if (removeCheckbox instanceof HTMLInputElement) {
      removeCheckbox.value = rowKey;
    }

    const row = fragment.querySelector("[data-alias-row]");
    if (row instanceof HTMLElement) {
      row.setAttribute("data-row-key", rowKey);
    }

    aliasRows.appendChild(fragment);
    updateSummary();
  });

  form.addEventListener("change", updateSummary);
  updateSummary();

  if (
    !openDeleteButton
    || !deleteDialog
    || !cancelDeleteButton
    || !deleteItemForm
    || !deleteConfirmInput
    || !deleteConfirmError
  ) {
    return;
  }

  const closeDeleteDialog = () => {
    deleteDialog.classList.add("hidden");
    deleteDialog.classList.remove("flex");
    if (deleteConfirmInput instanceof HTMLInputElement) {
      deleteConfirmInput.value = "";
    }
    deleteConfirmError.classList.add("hidden");
  };

  openDeleteButton.addEventListener("click", () => {
    deleteDialog.classList.remove("hidden");
    deleteDialog.classList.add("flex");
    if (deleteConfirmInput instanceof HTMLInputElement) {
      deleteConfirmInput.focus();
    }
  });

  cancelDeleteButton.addEventListener("click", closeDeleteDialog);

  deleteDialog.addEventListener("click", (event) => {
    if (event.target === deleteDialog) {
      closeDeleteDialog();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && deleteDialog.classList.contains("flex")) {
      closeDeleteDialog();
    }
  });

  deleteItemForm.addEventListener("submit", (event) => {
    if (!(deleteConfirmInput instanceof HTMLInputElement)) {
      return;
    }

    const expectedTitle = deleteConfirmInput.getAttribute("data-confirm-title") ?? "";
    if (deleteConfirmInput.value.trim() !== expectedTitle.trim()) {
      event.preventDefault();
      deleteConfirmError.classList.remove("hidden");
      deleteConfirmInput.focus();
      return;
    }

    deleteConfirmError.classList.add("hidden");
  });
};
