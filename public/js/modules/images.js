export const configureImageFallbacks = (root = document) => {
  root.querySelectorAll("img[data-image-fallback]").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.classList.add("hidden");
        const fallback = image.nextElementSibling;
        fallback?.classList.remove("hidden");
        fallback?.classList.add("flex");
      },
      { once: true },
    );
  });
};
