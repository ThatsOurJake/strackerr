export const initializeItemEditForm = () => {
  const form = document.getElementById("item-edit-form");
  const aliasRows = document.getElementById("alias-rows");
  const aliasTemplate = document.getElementById("alias-row-template");
  const addAliasButton = document.getElementById("add-alias-row");
  const historyRemovalCount = document.getElementById("history-removal-count");
  const aliasRemovalCount = document.getElementById("alias-removal-count");

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
};
