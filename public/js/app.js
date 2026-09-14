import { initializeActivityChart } from "./modules/chart.js";
import { initializeMobileDrawer } from "./modules/drawer.js";
import { initializeFlashMessages } from "./modules/flash.js";
import { initializePasswordMatchValidation } from "./modules/forms.js";
import {
  configureHtmxElements,
  registerHtmxLifecycle,
} from "./modules/htmx.js";
import { renderIcons } from "./modules/icons.js";
import { initializeIdentifyPanelClose } from "./modules/identify.js";
import { configureImageFallbacks } from "./modules/images.js";
import { initializeItemEditForm } from "./modules/item-edit.js";
import { initializeActiveNavLinks } from "./modules/nav.js";
import { initializeThemeToggle } from "./modules/theme.js";

const initializeDom = () => {
  renderIcons();
  configureHtmxElements();
  configureImageFallbacks();
  initializeActivityChart();
  initializeThemeToggle();
  initializeMobileDrawer();
  initializeActiveNavLinks();
  initializeFlashMessages();
  initializePasswordMatchValidation();
  initializeIdentifyPanelClose();
  initializeItemEditForm();
};

document.addEventListener("DOMContentLoaded", initializeDom);

registerHtmxLifecycle({
  onAfterSwap: (target) => {
    renderIcons();
    configureHtmxElements(target);
    configureImageFallbacks(target);
  },
});
