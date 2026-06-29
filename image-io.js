import { createInitialImageRect } from "./image-transform.js";

export function setBackgroundImageFromFile(file, canvas, onImageReady) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const bgRect = createInitialImageRect(canvas, img);
      onImageReady(img, bgRect);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function isLikelyImageFile(file) {
  if (!file) {
    return false;
  }

  if (typeof file.type === "string" && file.type.startsWith("image/")) {
    return true;
  }

  // Some drag sources on Windows may omit MIME type; use extension fallback.
  const name = (file.name || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|tiff?|svg)$/.test(name);
}

export function bindImageImportHandlers({ canvas, canvasWrap, imageInput, onImageFile }) {
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (isLikelyImageFile(file)) {
      onImageFile(file);
    }
  });

  document.addEventListener("paste", (event) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    for (const item of items) {
      if (!item.type.startsWith("image/")) {
        continue;
      }

      const file = item.getAsFile();
      if (file) {
        onImageFile(file);
      }
      event.preventDefault();
      return;
    }
  });

  function dragHasFiles(event) {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("Files");
  }

  function firstDroppedImageFile(event) {
    const files = Array.from(event.dataTransfer?.files || []);
    return files.find((file) => isLikelyImageFile(file)) || null;
  }

  window.addEventListener("dragover", (event) => {
    if (!dragHasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    canvasWrap.classList.add("drag-over");
  });

  window.addEventListener("dragleave", (event) => {
    if (!dragHasFiles(event)) {
      return;
    }

    // If leaving the window viewport, stop highlight.
    if (event.clientX <= 0 || event.clientY <= 0 ||
      event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
      canvasWrap.classList.remove("drag-over");
    }
  });

  window.addEventListener("drop", (event) => {
    if (!dragHasFiles(event)) {
      return;
    }

    event.preventDefault();
    canvasWrap.classList.remove("drag-over");

    const file = firstDroppedImageFile(event);
    if (!file) {
      return;
    }

    onImageFile(file);
  });

  // Guard: prevent browser navigation if a file drop is missed by other handlers.
  document.addEventListener("drop", (event) => {
    if (dragHasFiles(event)) {
      event.preventDefault();
      canvasWrap.classList.remove("drag-over");
    }
  });
}
