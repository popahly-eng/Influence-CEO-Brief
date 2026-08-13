(() => {
  "use strict";

  const SECTION_LABELS = {
    crisis: "Crisis & Updates",
    coverage: "Media Coverage",
    event: "Upcoming Events"
  };

  const state = {
    section: "crisis",
    lastUrl: "",
    counts: {
      crisis: null,
      coverage: null,
      event: null,
      all: null
    }
  };

  const el = {
    sectionGroup: document.getElementById("sectionGroup"),
    urlInput: document.getElementById("urlInput"),
    urlHint: document.getElementById("urlHint"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    analysisCard: document.getElementById("analysisCard"),
    headlineInput: document.getElementById("headlineInput"),
    summaryInput: document.getElementById("summaryInput"),
    selectedSectionLabel: document.getElementById("selectedSectionLabel"),
    saveBtn: document.getElementById("saveBtn"),
    previewBtn: document.getElementById("previewBtn"),
    crisisCount: document.getElementById("crisisCount"),
    coverageCount: document.getElementById("coverageCount"),
    eventCount: document.getElementById("eventCount"),
    totalCount: document.getElementById("totalCount"),
    formError: document.getElementById("formError"),
    toast: document.getElementById("toast")
  };

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function setLoading(btn, active) {
    if (!btn) return;

    const spinner = btn.querySelector(".btn__spinner");
    const label = btn.querySelector(".btn__label");

    btn.disabled = active;

    if (spinner) {
      spinner.hidden = !active;
    }

    if (label) {
      label.style.opacity = active ? ".62" : "1";
    }
  }

  async function parseResponseSafely(res) {
    const text = await res.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        raw: text
      };
    }
  }

  function showToast(message, type = "success") {
    if (!el.toast) return;

    el.toast.textContent = message;
    el.toast.hidden = false;

    el.toast.className =
      `toast ${type === "error" ? "is-error" : "is-success"}`;

    clearTimeout(showToast._timer);

    showToast._timer = setTimeout(() => {
      el.toast.hidden = true;
    }, 3500);
  }

  function showError(message = "") {
    if (!el.formError) return;

    el.formError.hidden = !message;
    el.formError.textContent = message;
  }

  function updateSectionUI() {
    if (el.selectedSectionLabel) {
      el.selectedSectionLabel.textContent =
        SECTION_LABELS[state.section];
    }

    if (!el.sectionGroup) return;

    el.sectionGroup
      .querySelectorAll("[data-value]")
      .forEach((btn) => {
        btn.classList.toggle(
          "is-active",
          btn.dataset.value === state.section
        );
      });
  }

  function renderCounts() {
    const c = state.counts;

    if (el.crisisCount) {
      el.crisisCount.textContent = c.crisis ?? "—";
    }

    if (el.coverageCount) {
      el.coverageCount.textContent = c.coverage ?? "—";
    }

    if (el.eventCount) {
      el.eventCount.textContent = c.event ?? "—";
    }

    if (el.totalCount) {
      el.totalCount.textContent = c.all ?? "—";
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(CONFIG.STATS_URL, {
        method: "GET"
      });

      const data = await parseResponseSafely(res);

      if (
        !res.ok ||
        data.success === false ||
        !data.totals
      ) {
        throw new Error("Stats unavailable");
      }

      state.counts = {
        crisis: Number(data.totals.crisis || 0),
        coverage: Number(data.totals.coverage || 0),
        event: Number(data.totals.event || 0),
        all: Number(data.totals.all || 0)
      };

      renderCounts();
async function loadStats() {
  try {
    const res = await fetch(CONFIG.STATS_URL, {
      method: "GET",
      cache: "no-store"
    });

    const data = await parseResponseSafely(res);

    console.log("STATS RESPONSE:", data);

    if (!res.ok || data.success === false || !data.totals) {
      throw new Error("Could not load brief stats.");
    }

    state.counts = {
      crisis: Number(data.totals.crisis ?? 0),
      coverage: Number(data.totals.coverage ?? 0),
      event: Number(data.totals.event ?? 0),
      all: Number(data.totals.all ?? 0)
    };

    renderCounts();

  } catch (err) {
    console.error("Stats unavailable:", err);
  }
}

  async function loadFormConfig() {
    try {
      const res = await fetch(CONFIG.FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          test: true
        })
      });

      const data = await parseResponseSafely(res);

      if (!res.ok || data.success === false) {
        return;
      }

    } catch (err) {
      console.warn("Form config unavailable", err);
    }
  }

  async function analyze() {
    showError("");

    const url = el.urlInput.value.trim();

    if (!isValidUrl(url)) {
      showError(
        "Enter a valid URL starting with http:// or https://"
      );

      el.urlInput.focus();
      return;
    }

    setLoading(el.analyzeBtn, true);

    el.analysisCard.hidden = true;

    el.urlHint.textContent =
      "Analyzing article and preparing the executive brief…";

    try {
      const res = await fetch(CONFIG.AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          section: state.section
        })
      });

      const data = await parseResponseSafely(res);

      if (
        !res.ok ||
        data.success === false ||
        !data.item
      ) {
        throw new Error(
          data.message ||
          data.error ||
          "AI analysis failed."
        );
      }

      el.headlineInput.value =
        data.item.headline || "";

      el.summaryInput.value =
        data.item.summary || "";

      state.lastUrl =
        data.item.url || url;

      el.analysisCard.hidden = false;

      el.urlHint.textContent =
        "AI analysis completed. Review and edit before adding to the brief.";

      el.analysisCard.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (err) {
      showError(
        err.message || "AI analysis failed."
      );

      el.urlHint.textContent =
        "Could not analyze this link.";

    } finally {
      setLoading(el.analyzeBtn, false);
    }
  }

  async function saveItem() {
    showError("");

    const headline =
      el.headlineInput.value.trim();

    const summary =
      el.summaryInput.value.trim();

    const url =
      state.lastUrl ||
      el.urlInput.value.trim();

    if (
      !headline ||
      !summary ||
      !isValidUrl(url)
    ) {
      showError(
        "Headline, summary, and a valid URL are required."
      );

      return;
    }

    setLoading(el.saveBtn, true);

    try {
      const res = await fetch(CONFIG.SAVE_URL, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json; charset=utf-8"
        },
        body: JSON.stringify({
          headline,
          summary,
          section: state.section,
          url
        })
      });

      const data =
        await parseResponseSafely(res);

      if (data.status === "duplicate") {
        showToast(
          "This item is already in the weekly brief.",
          "error"
        );

        return;
      }

      if (
        !res.ok ||
        data.success === false
      ) {
        const detail =
          Array.isArray(data.errors)
            ? data.errors.join(", ")
            : (
              data.message ||
              "Save failed."
            );

        throw new Error(detail);
      }

      showToast(
        "Item added to the weekly brief."
      );

      await loadStats();

      el.analysisCard.hidden = true;

      el.headlineInput.value = "";
      el.summaryInput.value = "";
      el.urlInput.value = "";

      state.lastUrl = "";

    } catch (err) {
      showError(
        err.message ||
        "Could not save the item."
      );

    } finally {
      setLoading(el.saveBtn, false);
    }
  }

  async function previewBrief() {
    showError("");

    setLoading(el.previewBtn, true);

    try {
      const res = await fetch(
        CONFIG.PREVIEW_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            source: "control-center"
          })
        }
      );

      const data =
        await parseResponseSafely(res);

      if (
        !res.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
          "Preview workflow failed."
        );
      }

      await loadStats();

      showToast(
        "Preview workflow started. Check the test inbox."
      );

    } catch (err) {
      showError(
        err.message ||
        "Could not generate the preview."
      );

    } finally {
      setLoading(el.previewBtn, false);
    }
  }

  if (el.sectionGroup) {
    el.sectionGroup.addEventListener(
      "click",
      (event) => {
        const btn =
          event.target.closest("[data-value]");

        if (!btn) return;

        state.section =
          btn.dataset.value;

        updateSectionUI();
      }
    );
  }

  if (el.analyzeBtn) {
    el.analyzeBtn.addEventListener(
      "click",
      analyze
    );
  }

  if (el.saveBtn) {
    el.saveBtn.addEventListener(
      "click",
      saveItem
    );
  }

  if (el.previewBtn) {
    el.previewBtn.addEventListener(
      "click",
      previewBrief
    );
  }

  if (el.urlInput) {
    el.urlInput.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          analyze();
        }
      }
    );
  }

updateSectionUI();
renderCounts();
loadFormConfig();
loadStats();
})();
