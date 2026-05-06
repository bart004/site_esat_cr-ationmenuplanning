(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector("#siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  const videosGrid = document.querySelector("#videosGrid");
  const videosEmpty = document.querySelector("#videosEmpty");
  if (!videosGrid || !videosEmpty) return;

  // Ajouter ici les liens video a afficher.
  const VIDEO_LINKS = [
    "https://dai.ly/k1QUkpqAdv9FQrFQBR8"
  ];

  function parseVideo(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        return { provider: "youtube", id: parsed.pathname.replace("/", "") };
      }
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v");
        if (id) return { provider: "youtube", id: id };
        const parts = parsed.pathname.split("/");
        const embedIndex = parts.indexOf("embed");
        if (embedIndex >= 0 && parts[embedIndex + 1]) {
          return { provider: "youtube", id: parts[embedIndex + 1] };
        }
      }
      if (parsed.hostname.includes("dai.ly")) {
        return { provider: "dailymotion", id: parsed.pathname.replace("/", "") };
      }
      if (parsed.hostname.includes("dailymotion.com")) {
        const parts = parsed.pathname.split("/");
        const idx = parts.indexOf("video");
        if (idx >= 0 && parts[idx + 1]) {
          return { provider: "dailymotion", id: parts[idx + 1] };
        }
      }
    } catch (_err) {
      return null;
    }
    return null;
  }

  function createCard(url) {
    const card = document.createElement("article");
    card.className = "video-card";

    const videoInfo = parseVideo(url);

    const title = document.createElement("h2");
    title.className = "video-title";
    title.textContent = "Tutoriel video";

    const link = document.createElement("a");
    link.className = "video-file";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = url;

    const status = document.createElement("p");
    status.className = "video-status";
    status.hidden = true;

    if (!videoInfo || !videoInfo.id) {
      status.textContent = "Lien video invalide.";
      card.appendChild(status);
      card.appendChild(title);
      card.appendChild(link);
      return card;
    }

    const isFileProtocol = window.location.protocol === "file:";

    if (!isFileProtocol) {
      const player = document.createElement("iframe");
      player.className = "video-player";
      player.loading = "lazy";
      player.referrerPolicy = "strict-origin-when-cross-origin";
      player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      player.allowFullscreen = true;
      if (videoInfo.provider === "youtube") {
        player.src = "https://www.youtube-nocookie.com/embed/" + videoInfo.id;
      } else {
        player.src = "https://www.dailymotion.com/embed/video/" + videoInfo.id;
      }
      card.appendChild(player);
    } else {
      status.hidden = false;
      status.textContent = "Lecture integree bloquee en ouverture locale (file://). Ouvrez via un serveur local pour activer le lecteur.";

      const thumbnail = document.createElement("img");
      thumbnail.className = "video-player";
      if (videoInfo.provider === "youtube") {
        thumbnail.src = "https://i.ytimg.com/vi/" + videoInfo.id + "/hqdefault.jpg";
        thumbnail.alt = "Miniature YouTube";
      } else {
        thumbnail.src = "https://www.dailymotion.com/thumbnail/video/" + videoInfo.id;
        thumbnail.alt = "Miniature Dailymotion";
      }
      thumbnail.loading = "lazy";
      card.appendChild(thumbnail);
    }

    const watchBtn = document.createElement("a");
    watchBtn.className = "btn btn-red video-watch-btn";
    watchBtn.href = url;
    watchBtn.target = "_blank";
    watchBtn.rel = "noopener noreferrer";
    watchBtn.textContent = "▶ Regarder la video";

    card.appendChild(status);
    card.appendChild(title);
    card.appendChild(watchBtn);
    card.appendChild(link);
    return card;
  }

  function render() {
    videosGrid.innerHTML = "";
    if (VIDEO_LINKS.length === 0) {
      videosEmpty.hidden = false;
      return;
    }
    videosEmpty.hidden = true;
    VIDEO_LINKS.forEach(function (url) {
      videosGrid.appendChild(createCard(url));
    });
  }

  render();
})();
