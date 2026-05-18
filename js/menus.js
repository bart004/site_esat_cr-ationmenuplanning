(function () {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const CATEGORIES = ["Entrée", "Plat", "Accompagnement", "Fromage", "Dessert"];

  // ─── Nav toggle ────────────────────────────────────────────────────────────
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector("#siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const weekDateInput  = document.querySelector("#weekDate");
  const menuBody       = document.querySelector("#menuBody");
  const toggleModeBtn  = document.querySelector("#toggleModeBtn");
  const exportCsvBtn   = document.querySelector("#exportCsvBtn");
  const printBtn       = document.querySelector("#printBtn");
  const dayDateEls     = Array.from(document.querySelectorAll("[data-day-date]"));
  const printTitle     = document.querySelector("#printTitle");
  const table          = document.querySelector("#menuTable");

  if (!weekDateInput || !menuBody || !toggleModeBtn || !exportCsvBtn || !printBtn || !table) {
    return;
  }

  let isPreview     = false;
  let currentMonday = getMonday(new Date());
  let state         = createEmptyState();

  // ─── Helpers ───────────────────────────────────────────────────────────────
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
    return getMonday(new Date(value + "T00:00:00"));
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

  function normalizeState(parsed) {
    const normalized = createEmptyState();
    for (let r = 0; r < CATEGORIES.length; r += 1) {
      for (let c = 0; c < DAYS.length; c += 1) {
        const cell = parsed && parsed[r] && parsed[r][c];
        if (Array.isArray(cell) && cell.length > 0) {
          normalized[r][c] = cell.map(function (item) {
            return {
              text:  item && typeof item.text  === "string" ? item.text  : "",
              image: item && typeof item.image === "string" ? item.image : ""
            };
          });
        }
      }
    }
    return normalized;
  }

  // ─── Image compression ─────────────────────────────────────────────────────
  /**
   * Compresse un File image :
   *   - redimensionné à 400×400 px maximum (ratio conservé)
   *   - réencodé en WebP à qualité 75 %
   * Utilise uniquement Canvas + createImageBitmap (API natives navigateur).
   *
   * @param {File} file
   * @returns {Promise<Blob>}
   */
  async function compressImage(file) {
    const MAX = 400;
    const bitmap = await createImageBitmap(file);

    let w = bitmap.width;
    let h = bitmap.height;

    if (w > MAX || h > MAX) {
      if (w >= h) {
        h = Math.round(h * MAX / w);
        w = MAX;
      } else {
        w = Math.round(w * MAX / h);
        h = MAX;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) { resolve(blob); }
        else      { reject(new Error("toBlob a échoué")); }
      }, "image/webp", 0.75);
    });
  }

  // ─── Supabase Storage upload ────────────────────────────────────────────────
  /**
   * Compresse puis uploade une image dans le bucket "menu-images".
   * Retourne l'URL publique Supabase du fichier uploadé.
   *
   * @param {File} file
   * @returns {Promise<string>} URL publique
   */
  async function uploadImage(file) {
    const blob     = await compressImage(file);
    const fileName = Date.now() + "_" + Math.random().toString(36).slice(2) + ".webp";

    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from("menu-images")
      .upload(fileName, blob, { contentType: "image/webp", upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient
      .storage
      .from("menu-images")
      .getPublicUrl(uploadData.path);

    return urlData.publicUrl;
  }

  // ─── Supabase DB : sauvegarde ───────────────────────────────────────────────
  /**
   * Upserte le menu courant dans la table "menus".
   *
   * Colonnes :
   *   name        → identifiant semaine  ex. "menu_2025-W20"
   *   created_at  → lundi de la semaine sélectionnée (ISO 8601)
   *   data        → structure JSON complète du menu (textes + URLs images)
   *   image_urls  → tableau dédupliqué de toutes les URLs publiques du menu
   */
  async function saveState() {
    const key = weekKeyFromMonday(currentMonday);

    // Collecte de toutes les URLs publiques présentes dans le state
    const imageUrls = [];
    state.forEach(function (row) {
      row.forEach(function (cell) {
        cell.forEach(function (item) {
          if (item.image && item.image.startsWith("http")) {
            imageUrls.push(item.image);
          }
        });
      });
    });

    const { error } = await supabaseClient
      .from("menus")
      .upsert(
        {
          name:       key,
          created_at: currentMonday.toISOString(),  // date choisie par l'utilisateur
          data:       state,
          image_urls: imageUrls
        },
        { onConflict: "name" }
      );

    if (error) {
      console.error("Erreur lors de la sauvegarde du menu :", error.message);
    }
  }

  // ─── Supabase DB : chargement ───────────────────────────────────────────────
  /**
   * Charge le menu de la semaine courante depuis la table "menus".
   * Si aucun enregistrement n'existe, initialise un state vide.
   */
  async function loadState() {
    const key = weekKeyFromMonday(currentMonday);

    const { data, error } = await supabaseClient
      .from("menus")
      .select("data")
      .eq("name", key)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors du chargement du menu :", error.message);
      state = createEmptyState();
      return;
    }

    state = data ? normalizeState(data.data) : createEmptyState();
  }

  // ─── Mise à jour de l'en-tête ───────────────────────────────────────────────
  function updateHeaderDates() {
    for (let i = 0; i < dayDateEls.length; i += 1) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      dayDateEls[i].textContent = formatDateFR(d);
    }
    const friday = new Date(currentMonday);
    friday.setDate(currentMonday.getDate() + 4);
    printTitle.textContent =
      "Menu de la semaine du " + formatDateFR(currentMonday) +
      " au " + formatDateFR(friday) + " — ESAT APAJH 94";
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  function render() {
    menuBody.innerHTML = "";

    for (let rowIdx = 0; rowIdx < CATEGORIES.length; rowIdx += 1) {
      const tr = document.createElement("tr");

      const categoryCell = document.createElement("td");
      categoryCell.className   = "category-cell";
      categoryCell.textContent = CATEGORIES[rowIdx];
      tr.appendChild(categoryCell);

      for (let dayIdx = 0; dayIdx < DAYS.length; dayIdx += 1) {
        const td        = document.createElement("td");
        td.className    = "menu-cell";
        td.dataset.row  = String(rowIdx);
        td.dataset.day  = String(dayIdx);

        // Bouton "+"
        const addBtn     = document.createElement("button");
        addBtn.className = "add-item-btn editable-only";
        addBtn.type      = "button";
        addBtn.textContent = "+";
        addBtn.addEventListener("click", function () {
          state[rowIdx][dayIdx].push({ text: "", image: "" });
          saveState();
          render();
        });
        td.appendChild(addBtn);

        // Zone d'édition
        const editContainer     = document.createElement("div");
        editContainer.className = "menu-items editable-only";
        state[rowIdx][dayIdx].forEach(function (item, itemIdx) {
          editContainer.appendChild(buildMenuItem(rowIdx, dayIdx, item, itemIdx));
        });
        td.appendChild(editContainer);

        // Zone d'aperçu
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
              const placeholder     = document.createElement("div");
              placeholder.className = "upload-box";
              placeholder.textContent = " ";
              prev.appendChild(placeholder);
            }

            const txt           = document.createElement("span");
            txt.textContent     = item.text || "-";
            prev.appendChild(txt);
            previewContainer.appendChild(prev);
          }
        });

        const empty           = document.createElement("div");
        empty.className       = "preview-empty";
        empty.textContent     = previewCount === 0 ? "-" : "";
        previewContainer.appendChild(empty);

        td.appendChild(previewContainer);
        tr.appendChild(td);
      }
      menuBody.appendChild(tr);
    }

    document.body.classList.toggle("preview-mode", isPreview);
    toggleModeBtn.textContent = isPreview ? "👁️ Mode Aperçu" : "✏️ Mode Édition";
  }

  // ─── Construction d'un item éditable ───────────────────────────────────────
  function buildMenuItem(rowIdx, dayIdx, item, itemIdx) {
    const wrapper     = document.createElement("div");
    wrapper.className = "menu-item";

    // Zone d'upload / aperçu de l'image
    const upload     = document.createElement("label");
    upload.className = "upload-box";

    if (item.image) {
      const img = document.createElement("img");
      img.src   = item.image;
      img.alt   = "Pictogramme";
      upload.appendChild(img);
    } else {
      upload.textContent = "↑";
    }

    const fileInput    = document.createElement("input");
    fileInput.type     = "file";
    fileInput.accept   = "image/*";

    fileInput.addEventListener("change", async function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      // Indicateur visuel pendant l'upload
      upload.textContent = "⏳";

      try {
        const publicUrl = await uploadImage(file);
        state[rowIdx][dayIdx][itemIdx].image = publicUrl;
        await saveState();
        render();
      } catch (err) {
        console.error("Erreur lors de l'upload de l'image :", err);
        upload.textContent = "⚠️";
      }
    });

    upload.appendChild(fileInput);
    wrapper.appendChild(upload);

    // Input texte
    const input         = document.createElement("input");
    input.className     = "menu-input";
    input.type          = "text";
    input.placeholder   = "Nom...";
    input.value         = item.text;
    input.addEventListener("input", function (e) {
      state[rowIdx][dayIdx][itemIdx].text = e.target.value;
      saveState(); // async, fire-and-forget
      renderPreviewOnly(rowIdx, dayIdx);
    });
    wrapper.appendChild(input);

    // Bouton de suppression (sauf premier item)
    if (itemIdx > 0) {
      const removeBtn       = document.createElement("button");
      removeBtn.type        = "button";
      removeBtn.className   = "remove-item-btn";
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
    const cell = document.querySelector(
      '.menu-cell[data-row="' + rowIdx + '"][data-day="' + dayIdx + '"]'
    );
    if (!cell) return;
    render();
  }

  // ─── Export CSV ─────────────────────────────────────────────────────────────
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
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(";");
    }).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const iso  = getIsoWeek(currentMonday);
    a.href     = url;
    a.download = "menu_" + iso.year + "-W" + String(iso.week).padStart(2, "0") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ─── Événements ─────────────────────────────────────────────────────────────
  weekDateInput.addEventListener("change", function () {
    currentMonday = mondayFromInputDate(weekDateInput.value);
    weekDateInput.value = inputValueFromMonday(currentMonday);
    updateHeaderDates();
    loadState().then(render);
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

  // ─── Initialisation ─────────────────────────────────────────────────────────
  currentMonday       = getMonday(new Date());
  weekDateInput.value = inputValueFromMonday(currentMonday);
  updateHeaderDates();
  loadState().then(render);
})();
