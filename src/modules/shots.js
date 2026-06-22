const DEFAULT_BASE_URL = "https://alex.slateapp.com/api/v1";

const cache = new Map();

export function initShots(container = document) {
  const config = getConfig();

  initWorkBindings(container, config);
  initShowreelBindings(container, config);
}

function initWorkBindings(container, config) {
  container.querySelectorAll("[data-shots-work]").forEach((root) => {
    const id = root.dataset.shotsWork;

    if (!id) {
      return;
    }

    fetchShots(`work/${id}`, config)
      .then((work) => bindMedia(root, work))
      .catch((error) => console.warn(`[shots] Could not load work ${id}.`, error));
  });
}

function initShowreelBindings(container, config) {
  container.querySelectorAll("[data-shots-showreel]").forEach((root) => {
    const id = root.dataset.shotsShowreel;
    const template = root.querySelector("[data-shots-template]");

    if (!id || !template) {
      return;
    }

    template.hidden = true;

    fetchShots(`showreel/${id}`, config)
      .then((showreel) => {
        root.querySelectorAll("[data-shots-item]").forEach((item) => item.remove());

        showreel.media?.forEach((media) => {
          const item = template.cloneNode(true);
          item.hidden = false;
          item.removeAttribute("data-shots-template");
          item.dataset.shotsItem = "";
          bindMedia(item, media);
          template.before(item);
        });
      })
      .catch((error) =>
        console.warn(`[shots] Could not load showreel ${id}.`, error),
      );
  });
}

function bindMedia(root, media) {
  const videoUrl = getVideoUrl(media);
  const posterUrl = getPosterUrl(media);

  root.querySelectorAll("[data-shots-title]").forEach((element) => {
    element.textContent = media.title || "";
  });

  root.querySelectorAll("[data-shots-poster]").forEach((element) => {
    if (element instanceof HTMLImageElement) {
      element.src = posterUrl || "";
      element.alt ||= media.title || "";
    } else if (posterUrl) {
      element.style.backgroundImage = `url("${posterUrl}")`;
    }
  });

  const videos =
    root instanceof HTMLVideoElement
      ? [root]
      : [...root.querySelectorAll("video[data-shots-video]")];

  videos.forEach((video) => {
    if (!videoUrl) {
      return;
    }

    video.src = videoUrl;
    video.poster = posterUrl || "";
    video.playsInline = true;
    video.preload ||= "metadata";

    if (video.hasAttribute("data-shots-autoplay")) {
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.play().catch(() => {});
    }
  });
}

function getVideoUrl(media) {
  const streams = Object.values(media.streams || {});
  const mp4Streams = streams.filter(
    (stream) =>
      stream.file?.remote_address && stream.stream_type?.output === "mp4",
  );

  return (
    mp4Streams.sort(
      (a, b) => (b.stream_type?.bitrate || 0) - (a.stream_type?.bitrate || 0),
    )[0]?.file?.remote_address || null
  );
}

function getPosterUrl(media) {
  return media.thumbnail?.image_player_url || media.thumbnail?.remote_address || null;
}

async function fetchShots(path, config) {
  const url = buildUrl(path, config);
  const cacheKey = url.toString();

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    })
    .then((data) => data.response);

  cache.set(cacheKey, request);
  return request;
}

function buildUrl(path, config) {
  if (config.proxyUrl) {
    const url = new URL(config.proxyUrl);
    url.searchParams.set("path", path);
    return url;
  }

  if (!config.accessToken) {
    throw new Error("Missing Shots access token.");
  }

  const url = new URL(`${config.baseUrl}/${path}`);
  url.searchParams.set("access_token", config.accessToken);
  return url;
}

function getConfig() {
  return {
    baseUrl: window.ShotsConfig?.baseUrl || DEFAULT_BASE_URL,
    accessToken: window.ShotsConfig?.accessToken || "",
    proxyUrl: window.ShotsConfig?.proxyUrl || "",
  };
}
