const identities = [
  {
    id: "cutline",
    name: "Cutline",
    label: "01 / PRECISION",
    description:
      "A wide, sculpted wordmark. An open G and one diagonal cut give it a precise, architectural character.",
  },
  {
    id: "aperture",
    name: "Aperture",
    label: "02 / CONNECTION",
    description:
      "A nested G with a line running through it. A compact symbol for connected thinking, paired with quiet lettering.",
  },
  {
    id: "editorial",
    name: "Editorial",
    label: "03 / AUTHORSHIP",
    description:
      "Expressive serif lettering and a small maker’s star. A personal, editorial direction with a warmer presence.",
  },
];
export function createIdentity() {
  let selected = "editorial";
  try {
    const saved = localStorage.getItem("gas-identity");
    if (identities.some((i) => i.id === saved)) selected = saved;
  } catch {}
  const dialog = document.querySelector("#identity-dialog");
  const trigger = document.querySelector("#logo-options-trigger");
  document.querySelector("#identity-grid").innerHTML = identities
    .map(
      (i) =>
        `<button class="identity-option" data-identity="${i.id}" aria-pressed="false"><span class="identity-meta">${i.label}</span><span class="identity-swatch"><img src="/identity/${i.id}-dark.svg" alt="${i.name} GAS logo on dark" /></span><span class="identity-swatch identity-light"><img src="/identity/${i.id}-light.svg" alt="${i.name} GAS logo on light" /></span><strong>${i.name}<i>↗</i></strong><span class="identity-description">${i.description}</span><span class="identity-select">Preview this direction <i>○</i></span></button>`,
    )
    .join("");
  function refresh() {
    const theme =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    document.querySelectorAll(".brand img").forEach((img) => {
      img.src = `/identity/${selected}-${theme}.svg`;
    });
    document.querySelector('link[rel="icon"]').href =
      `/identity/${selected}-icon.svg`;
    document.querySelectorAll("[data-identity]").forEach((b) => {
      const active = b.dataset.identity === selected;
      b.setAttribute("aria-pressed", String(active));
      b.querySelector(".identity-select").innerHTML = active
        ? "Currently previewing <i>●</i>"
        : "Preview this direction <i>○</i>";
    });
    document.querySelector("#identity-status").textContent =
      `Previewing ${identities.find((i) => i.id === selected).name} · saved on this device`;
  }
  trigger.addEventListener("click", () => dialog.showModal());
  function close() {
    dialog.close();
    trigger.focus({ preventScroll: true });
  }
  document.querySelector("#identity-close").addEventListener("click", close);
  document.querySelector("#identity-done").addEventListener("click", close);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    }
  });
  dialog.addEventListener("cancel", () =>
    requestAnimationFrame(() => trigger.focus({ preventScroll: true })),
  );
  document.querySelectorAll("[data-identity]").forEach((b) =>
    b.addEventListener("click", () => {
      selected = b.dataset.identity;
      try {
        localStorage.setItem("gas-identity", selected);
      } catch {}
      refresh();
    }),
  );
  refresh();
  return { refresh };
}
