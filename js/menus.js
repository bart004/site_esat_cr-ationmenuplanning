(function () {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const CATEGORIES = ["Entrée", "Plat", "Accompagnement", "Dessert"];

  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector("#siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  const weekDateInput = document.querySelector("#weekDate");
  const menuBody = document.querySelector("#menuBody");
  const toggleModeBtn = document.querySelector("#toggleModeBtn");
  const exportCsvBtn = document.querySelector("#exportCsvBtn");
  const printBtn = document.querySelector("#printBtn");
  const dayDateEls = Array.from(document.querySelectorAll("[data-day-date]"));
  const printTitle = document.querySelector("#printTitle");
  const table = document.querySelector("#menuTable");

  if (!weekDateInput || !menuBody || !toggleModeBtn || !exportCsvBtn || !printBtn || !table) {
    return;
  }

  let isPreview = false;
  let currentMonday = getMonday(new Date());
  let state = createEmptyState();

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatDateFR(date) {
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1);
  }

  function getIsoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  }

  function weekKeyFromMonday(monday) {
    const iso = getIsoWeek(monday);
    return "menu_" + iso.year + "-W" + String(iso.week).padStart(2, "0");
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

  function createEmptyState() {
    const rows = [];
    for (let r = 0; r < CATEGORIES.length; r += 1) {
      const row = [];
      for (let c = 0; c < DAYS.length; c += 1) {
        row.push([{ text: "", image: "" }]);
      }
      rows.push(row);
    }
    return rows;
  }

  function loadState() {
    const key = weekKeyFromMonday(currentMonday);
    const raw = localStorage.getItem(key);
    if (!raw) {
      state = createEmptyState();
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state = normalizeState(parsed);
    } catch (_err) {
      state = createEmptyState();
    }
  }

  function normalizeState(parsed) {
    const normalized = createEmptyState();
    for (let r = 0; r < CATEGORIES.length; r += 1) {
      for (let c = 0; c < DAYS.length; c += 1) {
        const cell = parsed && parsed[r] && parsed[r][c];
        if (Array.isArray(cell) && cell.length > 0) {
          normalized[r][c] = cell.map(function (item) {
            return {
              text: item && typeof item.text === "string" ? item.text : "",
              image: item && typeof item.image === "string" ? item.image : ""
            };
          });
        }
      }
    }
    return normalized;
  }

  function saveState() {
    const key = weekKeyFromMonday(currentMonday);
    localStorage.setItem(key, JSON.stringify(state));
  }

  function updateHeaderDates() {
    for (let i = 0; i < dayDateEls.length; i += 1) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      dayDateEls[i].textContent = formatDateFR(d);
    }
    const friday = new Date(currentMonday);
    friday.setDate(currentMonday.getDate() + 4);
    printTitle.textContent = "Menu de la semaine du " + formatDateFR(currentMonday) + " au " + formatDateFR(friday) + " — ESAT APAJH 94";
  }

  function render() {
    menuBody.innerHTML = "";
    for (let rowIdx = 0; rowIdx < CATEGORIES.length; rowIdx += 1) {
      const tr = document.createElement("tr");
      const categoryCell = document.createElement("td");
      categoryCell.className = "category-cell";
      categoryCell.textContent = CATEGORIES[rowIdx];
      tr.appendChild(categoryCell);

      for (let dayIdx = 0; dayIdx < DAYS.length; dayIdx += 1) {
        const td = document.createElement("td");
        td.className = "menu-cell";
        td.dataset.row = String(rowIdx);
        td.dataset.day = String(dayIdx);

        const addBtn = document.createElement("button");
        addBtn.className = "add-item-btn editable-only";
        addBtn.type = "button";
        addBtn.textContent = "+";
        addBtn.addEventListener("click", function () {
          state[rowIdx][dayIdx].push({ text: "", image: "" });
          saveState();
          render();
        });
        td.appendChild(addBtn);

        const editContainer = document.createElement("div");
        editContainer.className = "menu-items editable-only";
        state[rowIdx][dayIdx].forEach(function (item, itemIdx) {
          editContainer.appendChild(buildMenuItem(rowIdx, dayIdx, item, itemIdx));
        });
        td.appendChild(editContainer);

        const previewContainer = document.createElement("div");
        let previewCount = 0;
        state[rowIdx][dayIdx].forEach(function (item) {
          if (item.text.trim() || item.image) {
            previewCount += 1;
            const prev = document.createElement("div");
            prev.className = "preview-item";
            if (item.image) {
              const img = document.createElement("img");
              img.src = item.image;
              img.alt = "";
              prev.appendChild(img);
            } else {
              const imgPlaceholder = document.createElement("div");
              imgPlaceholder.className = "upload-box";
              imgPlaceholder.textContent = " ";
              prev.appendChild(imgPlaceholder);
            }
            const txt = document.createElement("span");
            txt.textContent = item.text || "-";
            prev.appendChild(txt);
            previewContainer.appendChild(prev);
          }
        });
        const empty = document.createElement("div");
        empty.className = "preview-empty";
        empty.textContent = previewCount === 0 ? "-" : "";
        previewContainer.appendChild(empty);
        td.appendChild(previewContainer);
        tr.appendChild(td);
      }
      menuBody.appendChild(tr);
    }

    document.body.classList.toggle("preview-mode", isPreview);
    toggleModeBtn.textContent = isPreview ? "👁️ Mode Aperçu" : "✏️ Mode Édition";
  }

  function buildMenuItem(rowIdx, dayIdx, item, itemIdx) {
    const wrapper = document.createElement("div");
    wrapper.className = "menu-item";

    const upload = document.createElement("label");
    upload.className = "upload-box";
    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = "Pictogramme";
      upload.appendChild(img);
    } else {
      upload.textContent = "↑";
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        state[rowIdx][dayIdx][itemIdx].image = String(e.target.result || "");
        saveState();
        render();
      };
      reader.readAsDataURL(file);
    });
    upload.appendChild(fileInput);
    wrapper.appendChild(upload);

    const input = document.createElement("input");
    input.className = "menu-input";
    input.type = "text";
    input.placeholder = "Nom...";
    input.value = item.text;
    input.addEventListener("input", function (e) {
      state[rowIdx][dayIdx][itemIdx].text = e.target.value;
      saveState();
      renderPreviewOnly(rowIdx, dayIdx);
    });
    wrapper.appendChild(input);

    if (itemIdx > 0) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-item-btn";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", function () {
        state[rowIdx][dayIdx].splice(itemIdx, 1);
        if (state[rowIdx][dayIdx].length === 0) {
          state[rowIdx][dayIdx].push({ text: "", image: "" });
        }
        saveState();
        render();
      });
      wrapper.appendChild(removeBtn);
    }

    return wrapper;
  }

  function renderPreviewOnly(rowIdx, dayIdx) {
    if (!isPreview) return;
    const cell = document.querySelector('.menu-cell[data-row="' + rowIdx + '"][data-day="' + dayIdx + '"]');
    if (!cell) return;
    render();
  }

  function exportCsv() {
    const headers = ["Catégories"].concat(DAYS.map(function (d, idx) {
      const dt = new Date(currentMonday);
      dt.setDate(currentMonday.getDate() + idx);
      return d + " " + formatDateFR(dt);
    }));
    const lines = [headers];

    for (let r = 0; r < CATEGORIES.length; r += 1) {
      const row = [CATEGORIES[r]];
      for (let c = 0; c < DAYS.length; c += 1) {
        const text = state[r][c]
          .filter(function (item) { return item.text.trim(); })
          .map(function (item) { return item.text.trim(); })
          .join(" | ");
        row.push(text || "-");
      }
      lines.push(row);
    }

    const csv = lines.map(function (row) {
      return row.map(function (cell) {
        const safe = String(cell).replace(/"/g, "\"\"");
        return '"' + safe + '"';
      }).join(";");
    }).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const iso = getIsoWeek(currentMonday);
    a.href = url;
    a.download = "menu_" + iso.year + "-W" + String(iso.week).padStart(2, "0") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  weekDateInput.addEventListener("change", function () {
    currentMonday = mondayFromInputDate(weekDateInput.value);
    weekDateInput.value = inputValueFromMonday(currentMonday);
    updateHeaderDates();
    loadState();
    render();
  });

  toggleModeBtn.addEventListener("click", function () {
    isPreview = !isPreview;
    render();
  });

  exportCsvBtn.addEventListener("click", exportCsv);
  printBtn.addEventListener("click", function () {
    if (!isPreview) {
      isPreview = true;
      render();
    }
    window.print();
  });

  currentMonday = getMonday(new Date());
  weekDateInput.value = inputValueFromMonday(currentMonday);
  updateHeaderDates();
  loadState();
  render();
})();
