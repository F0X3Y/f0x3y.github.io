// ===============================
// AUTH HELPERS
// ===============================

const AUTH_HEADER_NAME = "token";

function isPromise(value) {
    return !!value && typeof value.then === "function";
}

async function safeGetToken() {
    try {
        if (typeof window.get_token === "function") {
            const raw = window.get_token();
            const token = isPromise(raw) ? await raw : raw;
            const cleaned = (token ?? "").toString().trim();
            if (cleaned) return cleaned;
        }
    } catch (error) {
        console.warn("Token lekérés sikertelen:", error);
    }

    return "";
}

async function authHeaders(extraHeaders = {}) {
    const headers = new Headers(extraHeaders);
    const token = await safeGetToken();

    if (token) {
        headers.set(AUTH_HEADER_NAME, token);
    }

    return headers;
}

function getNextUrl(defaultUrl = "profile.html") {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (!next) return defaultUrl;
    if (/^https?:\/\//i.test(next)) return defaultUrl;

    return next;
}

function buildNavLink(href, text, className = "") {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;

    if (className) {
        link.className = className;
    }

    return link;
}

function attachPageTransitionHandlers(root = document) {
    root.querySelectorAll("a").forEach(link => {
        if (link.dataset.transitionBound === "1") return;
        link.dataset.transitionBound = "1";

        const url = link.href;

        if (
            url &&
            url.startsWith(window.location.origin) &&
            !link.target
        ) {
            link.addEventListener("click", event => {
                event.preventDefault();

                if (!document.startViewTransition) {
                    window.location.href = url;
                    return;
                }

                document.startViewTransition(() => {
                    window.location.href = url;
                });
            });
        }
    });
}

async function syncAuthNavigation() {
    const token = await safeGetToken();
    const loggedIn = !!token;

    document.querySelectorAll(".nav-actions").forEach(container => {
        const statusWidget = container.querySelector(".server-status-nav");
        container.innerHTML = "";

        if (statusWidget) {
            container.appendChild(statusWidget);
        }

        const links = loggedIn
            ? [
                ["index.html", "Home", ""],
                ["submit.html", "Beküldés", ""],
                ["clips.html", "Böngészés", ""],
                ["profile.html", "Profil", ""]
            ]
            : [
                ["index.html", "Home", ""],
                ["submit.html", "Beküldés", ""],
                ["clips.html", "Böngészés", ""],
                ["login.html", "Log in", "nav-login-btn"],
                ["signup.html", "Sign up", "nav-signup-btn"]
            ];

        links.forEach(([href, text, className]) => {
            container.appendChild(buildNavLink(href, text, className));
        });
    });

    attachPageTransitionHandlers();
}

async function setupProfileUsername() {
    const usernameEl = document.querySelector(".username");
    if (!usernameEl) return;

    try {
        if (typeof window.get_username === "function") {
            const raw = window.get_username();
            const resolved = isPromise(raw) ? await raw : raw;
            const username = (resolved ?? "").toString().trim();

            if (username) {
                usernameEl.textContent = username;
                return;
            }
        }
    } catch (error) {
        console.warn("Felhasználónév lekérés sikertelen:", error);
    }

    usernameEl.textContent = "Felhasználó";
}

function isSignupPasswordValid(password) {
    const lengthValid = password.length >= 8 && password.length <= 16;
    const numberValid = /\d/.test(password);
    const specialValid = /[^A-Za-z0-9]/.test(password);

    return {
        lengthValid,
        numberValid,
        specialValid,
        allValid: lengthValid && numberValid && specialValid
    };
}

function updateAuthButtonState() {
    const authButton = document.querySelector("#auth-form button[type='submit']");
    if (!authButton) return;

    const page = document.body?.dataset?.authPage;
    const passwordInput = document.getElementById("auth-password");

    let shouldDisable = !serverAvailable;

    if (page === "signup" && passwordInput) {
        const validity = isSignupPasswordValid(passwordInput.value);
        shouldDisable = shouldDisable || !validity.allValid;
    }

    authButton.disabled = shouldDisable;
    authButton.setAttribute("aria-disabled", String(shouldDisable));
    authButton.classList.toggle("disabled-submit", shouldDisable);
}

function setupPasswordChecklist() {
    if (document.body?.dataset?.authPage !== "signup") {
        return;
    }

    const passwordInput = document.getElementById("auth-password");
    const lengthCheck = document.getElementById("length-check");
    const numberCheck = document.getElementById("number-check");
    const specialCheck = document.getElementById("special-check");

    if (!passwordInput || !lengthCheck || !numberCheck || !specialCheck) {
        return;
    }

    function updateCheck(element, valid, text) {
        element.textContent = `${valid ? "✔" : "✗"} ${text}`;
        element.classList.toggle("password-valid", valid);
        element.classList.toggle("password-invalid", !valid);
    }

    function updatePasswordChecklist() {
        const password = passwordInput.value;
        const validity = isSignupPasswordValid(password);

        updateCheck(lengthCheck, validity.lengthValid, "8–16 karakter hosszú jelszó");
        updateCheck(numberCheck, validity.numberValid, "Tartalmaz számokat");
        updateCheck(specialCheck, validity.specialValid, "Tartalmaz különleges karaktereket");

        updateAuthButtonState();
    }

    passwordInput.addEventListener("input", updatePasswordChecklist);
    updatePasswordChecklist();
}

async function setupAuthPage() {
    const page = document.body?.dataset?.authPage;
    const form = document.getElementById("auth-form");
    const usernameInput = document.getElementById("auth-username");
    const passwordInput = document.getElementById("auth-password");
    const message = document.getElementById("auth-message");

    if (!page || !form || !usernameInput || !passwordInput) return;

    const token = await safeGetToken();
    if (token) {
        window.location.replace("profile.html");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            if (message) {
                message.textContent = "Tölts ki minden mezőt.";
                message.classList.add("visible");
                message.classList.remove("success");
            }
            return;
        }

        if (page === "signup") {
            const validity = isSignupPasswordValid(password);

            if (!validity.allValid) {
                if (message) {
                    message.textContent = "A jelszó nem felel meg a követelményeknek.";
                    message.classList.add("visible");
                    message.classList.remove("success");
                }
                return;
            }
        }

        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;

        try {
            const serverUrl = await get_url();
            const backendAction = page === "login" ? "login" : "signup";

            if (typeof window[backendAction] !== "function") {
                throw new Error(`Hiányzó backend függvény: ${backendAction}`);
            }

            await window[backendAction](serverUrl, username, password);

            const finalToken = await safeGetToken();
            if (!finalToken) {
                throw new Error("Nem érkezett token a backendtől.");
            }

            if (message) {
                message.textContent = page === "login"
                    ? "Sikeres bejelentkezés."
                    : "Sikeres regisztráció.";
                message.classList.add("visible", "success");
                message.classList.remove("error");
            }

            window.location.replace(getNextUrl("profile.html"));
        } catch (error) {
            console.error(error);
            if (message) {
                message.textContent = page === "login"
                    ? "Sikertelen bejelentkezés."
                    : "Sikertelen regisztráció.";
                message.classList.add("visible", "error");
                message.classList.remove("success");
            }
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

async function requireAuthForProfilePage() {
    if (!window.location.pathname.endsWith("profile.html")) {
        return true;
    }

    const token = await safeGetToken();
    if (!token) {
        window.location.replace(`login.html?next=${encodeURIComponent("profile.html")}`);
        return false;
    }

    return true;
}

async function requireAuthForSubmitPage() {
    if (!window.location.pathname.endsWith("submit.html")) return true;

    const token = await safeGetToken();
    if (!token) {
        window.location.replace(`login.html?next=${encodeURIComponent("submit.html")}`);
        return false;
    }

    return true;
}

// ===============================
// COLOR THIEF ACCENT COLOR
// ===============================

const colorImage = new Image();
const root = document.documentElement;
const fallbackAccent = getComputedStyle(root).getPropertyValue("--accent-color").trim() || "#5865F2";

function applyAccentColor(value) {
    root.style.setProperty("--accent-color", value);
}

colorImage.src = "images/background.png";

colorImage.onload = () => {
    if (typeof window.ColorThief !== "function") {
        applyAccentColor(fallbackAccent);
        return;
    }

    try {
        const colorThief = new window.ColorThief();
        const palette = colorThief.getPalette(colorImage, 8);

        if (!palette || !palette.length) {
            applyAccentColor(fallbackAccent);
            return;
        }

        let bestColor = palette[0];
        let bestScore = 0;

        palette.forEach(color => {
            const r = color[0];
            const g = color[1];
            const b = color[2];
            const brightness = (r + g + b) / 3;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;
            const score = saturation * 2 + brightness;

            if (score > bestScore) {
                bestScore = score;
                bestColor = color;
            }
        });

        const rgb = `rgb(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]})`;
        applyAccentColor(rgb);
        console.log("Accent:", rgb);
    } catch (error) {
        console.warn("Accent color fallback used:", error);
        applyAccentColor(fallbackAccent);
    }
};

colorImage.onerror = () => {
    applyAccentColor(fallbackAccent);
};

// ===============================
// YOUTUBE LATEST CLIP SETUP
// ===============================

const latestClipPlaylist = document.getElementById("latest-clip-playlist");

if (latestClipPlaylist) {
    const latestVideoId = "YYiz76Nfhb0";
    latestClipPlaylist.src = `https://www.youtube.com/embed/${latestVideoId}`;
    latestClipPlaylist.setAttribute("data-video-id", latestVideoId);
}

// ===============================
// CLIP UPLOAD SYSTEM
// ===============================

const DUCKDNS_SERVER_URL = "https://m125gamedev.duckdns.org";
const FALLBACK_SERVER_URL = "https://m125gamedev.ipv64.de:59397";

async function get_url() {
    const candidates = [DUCKDNS_SERVER_URL, FALLBACK_SERVER_URL];

    for (const candidate of candidates) {
        try {
            const response = await fetchWithTimeout(`${candidate}/active`, 2000);

            if (response && response.ok) {
                return candidate;
            }
        } catch (error) {
            // A candidate nem elérhető, próbáljuk a következőt.
        }
    }

    return FALLBACK_SERVER_URL;
}

let SERVER_URL = FALLBACK_SERVER_URL;
let SERVER_STATUS_URL = `${SERVER_URL}/active`;

const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const clipContainer = document.getElementById("clip-container");
const profileClipList = document.getElementById("profile-clip-list");
const submitButton = document.querySelector(".submit-box button[type='submit']");
const uploadProgressWrapper = document.getElementById("upload-progress-wrapper");
const uploadProgressBar = document.getElementById("upload-progress-bar");
const uploadProgressText = document.getElementById("upload-progress-text");
const uploadStatus = document.getElementById("upload-status");

let serverAvailable = false;
let uploadErrorTimer = null;

function setUploadProgress(percent, visible = true, label) {
    if (!uploadProgressWrapper || !uploadProgressBar || !uploadProgressText) {
        return;
    }

    const clampedPercent = Math.min(100, Math.max(0, percent));
    const roundedPercent = Math.round(clampedPercent);
    const displayLabel = label ?? (roundedPercent > 0 ? `${roundedPercent}%` : "Feltöltés...");

    uploadProgressBar.style.width = `${clampedPercent}%`;
    uploadProgressBar.setAttribute("aria-valuenow", String(roundedPercent));
    uploadProgressText.textContent = displayLabel;
    uploadProgressWrapper.classList.toggle("visible", visible);

    if (!visible) {
        uploadProgressBar.style.width = "0%";
        uploadProgressBar.setAttribute("aria-valuenow", "0");
        uploadProgressText.textContent = "Feltöltés...";
    }
}

function showUploadError(message, durationMs = 10000) {
    if (!uploadStatus) {
        return;
    }

    clearTimeout(uploadErrorTimer);
    uploadStatus.textContent = message;
    uploadStatus.classList.remove("success");
    uploadStatus.classList.remove("error");
    uploadStatus.classList.add("visible", "error");

    uploadErrorTimer = setTimeout(() => {
        uploadStatus.classList.remove("visible", "error");
        setTimeout(() => {
            uploadStatus.textContent = "";
        }, 250);
    }, durationMs);
}

function showUploadSuccess(message, durationMs = 4000) {
    if (!uploadStatus) {
        return;
    }

    clearTimeout(uploadErrorTimer);
    uploadStatus.textContent = message;
    uploadStatus.classList.remove("error");
    uploadStatus.classList.add("visible", "success");

    uploadErrorTimer = setTimeout(() => {
        uploadStatus.classList.remove("visible", "success");
        setTimeout(() => {
            uploadStatus.textContent = "";
        }, 250);
    }, durationMs);
}

function resetSubmitPage() {
    if (fileInput) {
        fileInput.value = "";
    }

    if (clipContainer) {
        clipContainer.innerHTML = "";
    }

    if (dropZone) {
        dropZone.style.background = "";
    }

    setUploadProgress(0, false);
    updateSubmitButtonState();
    updateAuthButtonState();
}

const STATUS_POLL_INTERVAL_MS = 30000;
const STATUS_TIMEOUT_MS = 5000;

function setCheckingState() {
    const widgets = document.querySelectorAll("[data-server-status]");

    widgets.forEach(widget => {
        const statusText = widget.querySelector(".server-status-text");
        const statusDot = widget.querySelector(".server-status-dot");

        if (!statusText || !statusDot) {
            return;
        }

        widget.classList.remove("online", "offline");
        statusText.textContent = "A szerver ellenőrzése...";
        statusDot.setAttribute("aria-label", "checking");
    });
}

function updateSubmitButtonState() {
    if (!submitButton) {
        return;
    }

    const hasSelectedFiles = !!fileInput && fileInput.files && fileInput.files.length > 0;
    const shouldDisable = !serverAvailable || !hasSelectedFiles;

    submitButton.disabled = shouldDisable;
    submitButton.setAttribute("aria-disabled", String(shouldDisable));
    submitButton.classList.toggle("disabled-submit", shouldDisable);
}

function updateServerStatusWidgets(isOnline) {
    const widgets = document.querySelectorAll("[data-server-status]");

    widgets.forEach(widget => {
        const statusText = widget.querySelector(".server-status-text");
        const statusDot = widget.querySelector(".server-status-dot");

        if (!statusText || !statusDot) {
            return;
        }

        widget.classList.toggle("online", isOnline);
        widget.classList.toggle("offline", !isOnline);

        statusText.textContent = isOnline ? "A szerver online" : "A szerver offline";
        statusDot.setAttribute("aria-label", isOnline ? "online" : "offline");
    });

    serverAvailable = isOnline;
    updateSubmitButtonState();
    updateAuthButtonState();
}

async function initializeServerUrl() {
    SERVER_URL = await get_url();
    SERVER_STATUS_URL = `${SERVER_URL}/active`;
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const headers = await authHeaders(options.headers || {});

        return await fetch(url, {
            ...options,
            method: options.method || "GET",
            cache: "no-store",
            mode: "cors",
            headers,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function checkServerStatus() {
    setCheckingState();

    try {
        const response = await fetchWithTimeout(SERVER_STATUS_URL, STATUS_TIMEOUT_MS);

        if (response.ok && response.status === 200) {
            updateServerStatusWidgets(true);
            return;
        }
    } catch (error) {
        // A timeout vagy hibás válasz azt jelzi, hogy a szerver nem érhető el.
    }

    updateServerStatusWidgets(false);
}

const refreshButton = document.getElementById("server-status-refresh");
if (refreshButton) {
    refreshButton.addEventListener("click", checkServerStatus);
}

// ===============================
// FILE UPLOAD
// ===============================

async function uploadFile(file) {
    const token = await safeGetToken();

    if (!token) {
        setUploadProgress(0, false);
        showUploadError("Nincs bejelentkezve a felhasználó.");
        throw new Error("Missing auth token");
    }

    return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        setUploadProgress(0, true, "Feltöltés...");

        xhr.open("UPLOAD", SERVER_URL, true);
        xhr.setRequestHeader("Content-Length", String(file.size));
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.setRequestHeader("filename", file.name);
        xhr.setRequestHeader(AUTH_HEADER_NAME, token);

        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) {
                return;
            }

            const percent = (event.loaded / event.total) * 100;
            const label = percent > 0 ? `${Math.round(percent)}%` : "Feltöltés...";
            setUploadProgress(percent, true, label);
        });

        xhr.onload = () => {
            const ok = xhr.status >= 200 && xhr.status < 300;

            if (!ok) {
                setUploadProgress(0, false);
                showUploadError("Feltöltés sikertelen. Próbáld újra.");
                reject(new Error(`Upload failed with status ${xhr.status}`));
                return;
            }

            const responseText = xhr.responseText || "";
            console.log("Feltöltve:", file.name);
            console.log(responseText);
            setUploadProgress(100, true, "100%");

            setTimeout(() => {
                setUploadProgress(0, false);
            }, 600);

            resolve();
        };

        xhr.onerror = () => {
            setUploadProgress(0, false);
            showUploadError("Feltöltés sikertelen. Próbáld újra.");
            console.error("Feltöltési hiba:", file.name);
            reject(new Error("Upload request failed"));
        };

        xhr.send(file);
    });
}

// ===============================
// CLIP CARD CREATION
// ===============================

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function createClipCard(file) {
    const card = document.createElement("div");
    card.className = "clip-card collapsed";

    const videoURL = URL.createObjectURL(file);
    const safeName = escapeHtml(file.name);

    card.innerHTML = `
        <div class="clip-header">
            <video
                class="preview"
                muted
                playsinline
                preload="metadata"
            >
                <source src="${videoURL}">
            </video>

            <div class="info">
                <input
                    class="filename"
                    value="${safeName}"
                    disabled
                >

                <div class="filesize">
                    ${formatSize(file.size)}
                </div>
            </div>

            <button
                class="expand"
                type="button"
            >
                ▼
            </button>
        </div>

        <div class="details">
            <input
                class="game"
                type="text"
                placeholder="Játék neve (opcionális)"
            >

            <textarea
                class="comment"
                maxlength="500"
                placeholder="Megjegyzés"
            ></textarea>

            <div class="counter">
                0 / 500
            </div>

            <button
                class="delete"
                type="button"
            >
                🗑 Törlés
            </button>
        </div>
    `;

    clipContainer.appendChild(card);

    const expand = card.querySelector(".expand");
    const filename = card.querySelector(".filename");
    const comment = card.querySelector(".comment");
    const counter = card.querySelector(".counter");
    const deleteButton = card.querySelector(".delete");
    const preview = card.querySelector(".preview");

    if (preview) {
        preview.addEventListener("loadedmetadata", () => {
            try {
                preview.currentTime = Math.min(0.1, preview.duration || 0);
            } catch {
                // ignore
            }
        });
    }

    expand.addEventListener("click", () => {
        card.classList.toggle("collapsed");

        if (card.classList.contains("collapsed")) {
            filename.disabled = true;
            expand.textContent = "▼";
        } else {
            filename.disabled = false;
            filename.focus();
            expand.textContent = "▲";
        }
    });

    comment.addEventListener("input", () => {
        counter.textContent = `${comment.value.length} / 500`;
    });

    deleteButton.addEventListener("click", () => {
        URL.revokeObjectURL(videoURL);
        card.remove();
    });
}

// ===============================
// FILE PROCESSING
// ===============================

async function handleFiles(files) {
    for (const file of files) {
        if (!file.type.startsWith("video/")) {
            continue;
        }

        createClipCard(file);

        try {
            await uploadFile(file);
        } catch (error) {
            console.error(error);
            break;
        }
    }
}

// ===============================
// FILE SIZE FORMAT
// ===============================

function formatSize(bytes) {
    if (bytes < 1024) {
        return bytes + " B";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ===============================
// INIT / PAGE-SPECIFIC LOGIC
// ===============================

(async () => {
    await syncAuthNavigation();

    const profileAuthOk = await requireAuthForProfilePage();
    if (!profileAuthOk) {
        return;
    }

    await setupProfileUsername();
    await setupAuthPage();
    setupPasswordChecklist();
    await requireAuthForSubmitPage();

    await initializeServerUrl();

    updateAuthButtonState();
    updateSubmitButtonState();
    checkServerStatus();
    setInterval(checkServerStatus, STATUS_POLL_INTERVAL_MS);

    // Csak submit oldalon fusson
    if (fileInput && dropZone && clipContainer && submitButton) {
        submitButton.addEventListener("click", () => {
            const hasSelectedFiles = fileInput.files && fileInput.files.length > 0;

            if (!hasSelectedFiles) {
                return;
            }

            resetSubmitPage();
            showUploadSuccess("Sikeres beküldés");
        });

        // ===============================
        // TALLÓZÁS
        // ===============================
        dropZone.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", () => {
            void handleFiles(fileInput.files).catch(error => {
                console.error(error);
            });
            updateSubmitButtonState();
        });

        // ===============================
        // DRAG & DROP
        // ===============================
        dropZone.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropZone.style.background = "#20232b";
        });

        dropZone.addEventListener("dragleave", () => {
            dropZone.style.background = "";
        });

        dropZone.addEventListener("drop", (event) => {
            event.preventDefault();
            dropZone.style.background = "";
            void handleFiles(event.dataTransfer.files).catch(error => {
                console.error(error);
            });
            updateSubmitButtonState();
        });
    }

    // Profile page interactions, if any
    if (profileClipList) {
        // placeholder for future profile clip logic
    }

    attachPageTransitionHandlers();
})();