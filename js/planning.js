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

  let currentWeek = getCurrentWeek();
  let state = createEmptyState();

  function getCurrentWeek() {
    const now = new Date();
    return isoWeekString(now);
  }

  function isoWeekString(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + "-W" + String(weekNo).padStart(2, "0");
  }

  function mondayFromWeek(weekStr) {
    const parts = weekStr.split("-W");
    const year = Number(parts[0]);
    const week = Number(parts[1]);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const day = simple.getDay();
    const monday = new Date(simple);
    if (day <= 4) {
      monday.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      monday.setDate(simple.getDate() + 8 - simple.getDay());
    }
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function formatDateFR(date) {
    return String(date.getDate()).padStart(2, "0") + "/" + String(date.getMonth() + 1).padStart(2, "0");
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
    return "planning_" + currentWeek;
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

    const monday = mondayFromWeek(currentWeek);
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

    const picLabel = document.createElement("label");
    picLabel.className = "activity-label";
    picLabel.textContent = "Pictogramme de l'activité :";
    card.appendChild(picLabel);

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
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = value || "";
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
    if (!weekInput.value) return;
    currentWeek = weekInput.value;
    load();
    render();
  });

  weekInput.value = currentWeek;
  load();
  render();
})();
