(function () {
  const DAYS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI"];

  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector("#siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  const weekInput = document.querySelector("#planningWeek");
  const clearBtn = document.querySelector("#clearPlanningBtn");
  const printBtn = document.querySelector("#printPlanningBtn");
  const columns = Array.from(document.querySelectorAll(".day-column"));
  const printTitle = document.querySelector("#planningPrintTitle");

  if (!weekInput || !clearBtn || !printBtn || columns.length !== 5) {
    return;
  }

  // ─── COLOR THEME ────────────────────────────────────────────────────────────

  const COLOR_STORAGE_KEY = "planning_colors";

  const DEFAULT_COLORS = {
    headerBg: "#c8a882",       // Beige/brun de l'en-tête des colonnes jours
    headerText: "#ffffff",     // Texte des en-têtes jours
    cardBg: "#f5ede0",         // Fond des cartes activité
    cardBorder: "#c8a882",     // Bordure des cartes
    activityTitle: "#4a2f00",  // Titre de l'activité (NOM DE L'ACTIVITÉ)
    activityMeta: "#5a4030",   // Horaires / lieu
    participantText: "#333333",// Texte participants
    tableBg: "#ffffff",        // Fond du tableau global
    titleBg: "#c8a882",        // Fond de la ligne de titre du planning (semaine)
    titleText: "#ffffff",      // Texte du titre de la semaine
  };

  let colors = loadColors();

  function loadColors() {
    try {
      const raw = localStorage.getItem(COLOR_STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULT_COLORS);
      return Object.assign({}, DEFAULT_COLORS, JSON.parse(raw));
    } catch (_) {
      return Object.assign({}, DEFAULT_COLORS);
    }
  }

  function saveColors() {
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
  }

  function applyColors() {
    const root = document.documentElement;
    root.style.setProperty("--planning-header-bg", colors.headerBg);
    root.style.setProperty("--planning-header-text", colors.headerText);
    root.style.setProperty("--planning-card-bg", colors.cardBg);
    root.style.setProperty("--planning-card-border", colors.cardBorder);
    root.style.setProperty("--planning-activity-title", colors.activityTitle);
    root.style.setProperty("--planning-activity-meta", colors.activityMeta);
    root.style.setProperty("--planning-participant-text", colors.participantText);
    root.style.setProperty("--planning-table-bg", colors.tableBg);
    root.style.setProperty("--planning-title-bg", colors.titleBg);
    root.style.setProperty("--planning-title-text", colors.titleText);
  }

  // ─── COLOR PANEL ────────────────────────────────────────────────────────────

  function buildColorPanel() {
    // Inject required CSS variables into a style tag if not already present
    if (!document.getElementById("planning-color-vars")) {
      const style = document.createElement("style");
      style.id = "planning-color-vars";
      style.textContent = `
      /* Color Panel Styles */
      #colorPanel {
        background: #fff;
        border: 2px solid var(--planning-header-bg);
        border-radius: 10px;
        padding: 18px 22px;
        margin: 12px 0;
        font-family: inherit;
        box-shadow: 0 2px 10px rgba(0,0,0,0.10);
      }
      #colorPanel summary {
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        color: var(--planning-activity-title);
        user-select: none;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #colorPanel summary::marker { display: none; }
      #colorPanel summary::-webkit-details-marker { display: none; }
      .color-panel-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px 20px;
        margin-top: 16px;
      }
      .color-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .color-row label {
        flex: 1;
        font-size: 0.88rem;
        color: #444;
        line-height: 1.3;
      }
      .color-row input[type="color"] {
        width: 38px;
        height: 30px;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 2px;
        cursor: pointer;
        background: none;
        flex-shrink: 0;
      }
      .color-panel-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .color-panel-actions button {
        padding: 7px 18px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: opacity 0.15s;
      }
      .color-panel-actions button:hover { opacity: 0.8; }
      #applyColorsBtn {
        background: var(--planning-header-bg);
        color: #fff;
      }
      #resetColorsBtn {
        background: #eee;
        color: #555;
      }
      @media print {
        #colorPanel { display: none !important; }
      }
    `;
      
      document.head.appendChild(style);
    }

    const colorDefs = [
      { key: "headerBg",        label: "Fond en-tête des jours" },
      { key: "headerText",      label: "Texte en-tête des jours" },
      { key: "titleBg",         label: "Fond barre de titre semaine" },
      { key: "titleText",       label: "Texte barre de titre semaine" },
      { key: "cardBg",          label: "Fond des cartes activité" },
      { key: "cardBorder",      label: "Bordure des cartes" },
      { key: "activityTitle",   label: "Titre de l'activité" },
      { key: "activityMeta",    label: "Horaires / Lieu" },
      { key: "participantText", label: "Texte participants" },
      { key: "tableBg",         label: "Fond du tableau" },
    ];

    const details = document.createElement("details");
    details.id = "colorPanel";
    details.className = "no-print";

    const summary = document.createElement("summary");
    summary.innerHTML = "🎨 Personnaliser les couleurs";
    details.appendChild(summary);

    const grid = document.createElement("div");
    grid.className = "color-panel-grid";

    colorDefs.forEach(function (def) {
      const row = document.createElement("div");
      row.className = "color-row";

      const lbl = document.createElement("label");
      lbl.textContent = def.label;

      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = colors[def.key];
      picker.dataset.key = def.key;
      picker.title = def.label;
      picker.addEventListener("input", function () {
        colors[def.key] = picker.value;
      });

      row.appendChild(lbl);
      row.appendChild(picker);
      grid.appendChild(row);
    });

    details.appendChild(grid);

    const actions = document.createElement("div");
    actions.className = "color-panel-actions";

    const applyBtn = document.createElement("button");
    applyBtn.id = "applyColorsBtn";
    applyBtn.type = "button";
    applyBtn.textContent = "✔ Appliquer";
    applyBtn.addEventListener("click", function () {
      saveColors();
      applyColors();
    });

    const resetBtn = document.createElement("button");
    resetBtn.id = "resetColorsBtn";
    resetBtn.type = "button";
    resetBtn.textContent = "↺ Réinitialiser";
    resetBtn.addEventListener("click", function () {
      colors = Object.assign({}, DEFAULT_COLORS);
      saveColors();
      applyColors();
      // Update pickers
      details.querySelectorAll("input[type=color]").forEach(function (picker) {
        picker.value = colors[picker.dataset.key];
      });
    });

    actions.appendChild(applyBtn);
    actions.appendChild(resetBtn);
    details.appendChild(actions);

    return details;
  }

  // Insert the color panel just before the planning columns container
  function insertColorPanel() {
    const panel = buildColorPanel();
    // Try to insert before the planning grid/table; fallback: before first column's parent
    const grid = columns[0] && columns[0].closest(".planning-grid, .planning-table, table, [class*='planning']");
    const target = grid || (columns[0] && columns[0].parentElement);
    if (target && target.parentElement) {
      target.parentElement.insertBefore(panel, target);
    } else {
      // Last resort: append after the toolbar area
      const toolbar = weekInput.closest("div, nav, header, section") || document.body;
      toolbar.appendChild(panel);
    }
  }

  // ─── ORIGINAL LOGIC (unchanged) ────────────────────────────────────────────

  let currentMonday = getMonday(new Date());
  let state = createEmptyState();

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function getIsoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  }

  function weekKeyFromMonday(monday) {
    const iso = getIsoWeek(monday);
    return "planning_" + iso.year + "-W" + String(iso.week).padStart(2, "0");
  }

  function getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function mondayFromInputDate(value) {
    if (!value) return getMonday(new Date());
    const date = new Date(value + "T00:00:00");
    return getMonday(date);
  }

  function inputValueFromMonday(monday) {
    return monday.getFullYear() + "-" + pad(monday.getMonth() + 1) + "-" + pad(monday.getDate());
  }

  function formatDateFR(date) {
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1);
  }

  function createEmptyActivity() {
    return {
      name: "",
      time: "",
      location: "",
      image: "",
      fileName: "",
      participants: [""]
    };
  }

  function createEmptyState() {
    return [[], [], [], [], []];
  }

  function storageKey() {
    return weekKeyFromMonday(currentMonday);
  }

  function save() {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  }

  function load() {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      state = createEmptyState();
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state = normalize(parsed);
    } catch (_err) {
      state = createEmptyState();
    }
  }

  function normalize(parsed) {
    const normalized = createEmptyState();
    for (let d = 0; d < 5; d += 1) {
      const dayList = Array.isArray(parsed && parsed[d]) ? parsed[d] : [];
      normalized[d] = dayList.map(function (item) {
        return {
          name: typeof item.name === "string" ? item.name : "",
          time: typeof item.time === "string" ? item.time : "",
          location: typeof item.location === "string" ? item.location : "",
          image: typeof item.image === "string" ? item.image : "",
          fileName: typeof item.fileName === "string" ? item.fileName : "",
          participants: Array.isArray(item.participants) && item.participants.length > 0
            ? item.participants.map(function (p) { return typeof p === "string" ? p : ""; })
            : [""]
        };
      });
    }
    return normalized;
  }

  function render() {
    columns.forEach(function (col, dayIdx) {
      col.innerHTML = "";

      if (state[dayIdx].length === 0) {
        col.appendChild(buildAddActivityButton(dayIdx));
      }

      state[dayIdx].forEach(function (activity, actIdx) {
        col.appendChild(buildActivityCard(dayIdx, actIdx, activity));
      });

      col.appendChild(buildAddActivityButton(dayIdx));
    });

    const monday = new Date(currentMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    printTitle.textContent = "Planning de la semaine du " + formatDateFR(monday) + " au " + formatDateFR(friday) + " — ESAT APAJH 94";
  }

  function buildAddActivityButton(dayIdx) {
    const btn = document.createElement("button");
    btn.className = "add-activity-btn no-print";
    btn.type = "button";
    btn.textContent = "➕ Ajouter une activité";
    btn.addEventListener("click", function () {
      state[dayIdx].push(createEmptyActivity());
      save();
      render();
    });
    return btn;
  }

  function buildActivityCard(dayIdx, actIdx, activity) {
    const card = document.createElement("article");
    card.className = "activity-card";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-activity-btn no-print";
    deleteBtn.textContent = "✕ Supprimer";
    deleteBtn.addEventListener("click", function () {
      state[dayIdx].splice(actIdx, 1);
      save();
      render();
    });
    card.appendChild(deleteBtn);

    const fileRow = document.createElement("div");
    fileRow.className = "file-row";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.className = "no-print";
    const fileName = document.createElement("span");
    fileName.className = "file-name";
    fileName.textContent = activity.fileName || "Aucun fichier sélectionné";
    fileInput.addEventListener("change", function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        activity.image = String(e.target.result || "");
        activity.fileName = file.name;
        save();
        render();
      };
      reader.readAsDataURL(file);
    });
    fileRow.appendChild(fileInput);
    fileRow.appendChild(fileName);
    card.appendChild(fileRow);

    const imageBox = document.createElement("div");
    imageBox.className = "activity-preview-box";
    if (activity.image) {
      const img = document.createElement("img");
      img.src = activity.image;
      img.alt = "Pictogramme activité";
      imageBox.appendChild(img);
    } else {
      imageBox.textContent = "80×80";
    }
    card.appendChild(imageBox);

    card.appendChild(buildInput("Nom de l'activité (ex: THEATRE)", activity.name, function (value) {
      activity.name = value;
      save();
    }));

    card.appendChild(buildInput("Horaires (ex: 10h30 - 12h00)", activity.time, function (value) {
      activity.time = value;
      save();
    }));

    card.appendChild(buildInput("Lieu (ex: Salle de réunion)", activity.location, function (value) {
      activity.location = value;
      save();
    }));

    const participantsLabel = document.createElement("label");
    participantsLabel.className = "activity-label";
    participantsLabel.textContent = "Participants :";
    card.appendChild(participantsLabel);

    const participantsWrap = document.createElement("div");
    activity.participants.forEach(function (participant, pIdx) {
      participantsWrap.appendChild(buildParticipantRow(activity, pIdx, participant));
    });
    card.appendChild(participantsWrap);

    const addParticipantBtn = document.createElement("button");
    addParticipantBtn.type = "button";
    addParticipantBtn.className = "add-participant-btn no-print";
    addParticipantBtn.textContent = "➕ Ajouter un participant";
    addParticipantBtn.addEventListener("click", function () {
      activity.participants.push("");
      save();
      render();
    });
    card.appendChild(addParticipantBtn);

    return card;
  }

  function buildInput(placeholder, value, onInput) {
    const input = document.createElement("textarea");
    input.placeholder = placeholder;
    input.value = value || "";
    input.rows = 2;
    input.addEventListener("input", function (e) {
      onInput(e.target.value);
    });
    return input;
  }

  function buildParticipantRow(activity, pIdx, value) {
    const row = document.createElement("div");
    row.className = "participant-row";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Nom participant " + (pIdx + 1);
    input.value = value || "";
    input.addEventListener("input", function (e) {
      activity.participants[pIdx] = e.target.value;
      save();
    });
    row.appendChild(input);

    if (pIdx > 0) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-participant-btn no-print";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", function () {
        activity.participants.splice(pIdx, 1);
        if (activity.participants.length === 0) {
          activity.participants.push("");
        }
        save();
        render();
      });
      row.appendChild(removeBtn);
    }
    return row;
  }

  clearBtn.addEventListener("click", function () {
    const ok = window.confirm("Supprimer toutes les activités de cette semaine ?");
    if (!ok) return;
    state = createEmptyState();
    save();
    render();
  });

  printBtn.addEventListener("click", function () {
    window.print();
  });

  weekInput.addEventListener("change", function () {
    currentMonday = mondayFromInputDate(weekInput.value);
    weekInput.value = inputValueFromMonday(currentMonday);
    load();
    render();
  });

  // ─── INIT ───────────────────────────────────────────────────────────────────

  weekInput.value = inputValueFromMonday(currentMonday);
  load();
  insertColorPanel();
  applyColors();
  render();
})();