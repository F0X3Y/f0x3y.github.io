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
const FALLBACK_SERVER_URL = "https://m125gamedev.ipv64.de:51088";

async function get_url() {
    const candidates = [DUCKDNS_SERVER_URL, FALLBACK_SERVER_URL];

    for (const candidate of candidates) {
        try {
            const response = await fetchWithTimeout(`${candidate}/active`, 2000);

            if (response && response.ok) {
                return candidate;
            }
        } catch (error) {
            // The candidate is unavailable, try the next one.
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
    uploadStatus.classList.add("visible");

    uploadErrorTimer = setTimeout(() => {
        uploadStatus.classList.remove("visible");
        setTimeout(() => {
            uploadStatus.textContent = "";
        }, 250);
    }, durationMs);
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
}

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            method: "GET",
            cache: "no-store",
            mode: "cors",
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

async function initializeServerUrl() {
    SERVER_URL = await get_url();
    SERVER_STATUS_URL = `${SERVER_URL}/active`;
    checkServerStatus();
}

initializeServerUrl();
updateSubmitButtonState();
setInterval(checkServerStatus, STATUS_POLL_INTERVAL_MS);


// Csak submit oldalon fusson

if (fileInput && dropZone && clipContainer) {



    // ===============================
    // TALLÓZÁS
    // ===============================


    dropZone.addEventListener("click", () => {

        fileInput.click();

    });




    fileInput.addEventListener("change", () => {

        handleFiles(fileInput.files);
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


        handleFiles(event.dataTransfer.files);
        updateSubmitButtonState();


    });



}






// ===============================
// PROFIL OLDAL: KÁRTYA INTERAKCIÓ
// ===============================

function setupClipCardInteractions(card) {
    const expand = card.querySelector(".expand");
    const filename = card.querySelector(".filename");
    const comment = card.querySelector(".comment");
    const counter = card.querySelector(".counter");
    const deleteButton = card.querySelector(".delete");

    if (!expand || !filename || !comment || !counter || !deleteButton) {
        return;
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
        card.remove();
    });
}

// ===============================
// FÁJLOK FELDOLGOZÁSA
// ===============================


async function handleFiles(files) {


    for (const file of files) {


        if (file.type.startsWith("video/")) {


            createClipCard(file);

            await uploadFile(file);


        }


    }


}

async function uploadFile(file) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        setUploadProgress(0, true, "Feltöltés...");

        xhr.open("UPLOAD", SERVER_URL, true);
        xhr.setRequestHeader("Content-Length", String(file.size));
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.setRequestHeader("filename", file.name);

        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) {
                return;
            }

            const percent = (event.loaded / event.total) * 100;
            const label = percent > 0 ? `${Math.round(percent)}%` : "Feltöltés...";
            setUploadProgress(percent, true, label);
        });

        xhr.onload = async () => {
            try {
                const responseText = xhr.responseText || "";
                console.log("Feltöltve:", file.name);
                console.log(responseText);
                setUploadProgress(100, true, "100%");

                setTimeout(() => {
                    setUploadProgress(0, false);
                }, 600);

                resolve();
            } catch (error) {
                reject(error);
            }
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
// CLIP KÁRTYA LÉTREHOZÁSA
// ===============================


function createClipCard(file) {



    const card = document.createElement("div");


    card.className = "clip-card collapsed";



    const videoURL = URL.createObjectURL(file);





    card.innerHTML = `


        <div class="clip-header">



            <video
                class="preview"
                muted
            >

                <source src="${videoURL}">

            </video>




            <div class="info">


                <input
                    class="filename"
                    value="${file.name}"
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






    // ===============================
    // ELEMEK
    // ===============================


    const expand = card.querySelector(".expand");

    const filename = card.querySelector(".filename");

    const comment = card.querySelector(".comment");

    const counter = card.querySelector(".counter");

    const deleteButton = card.querySelector(".delete");







    // ===============================
    // NYITÁS/ZÁRÁS
    // ===============================


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







    // ===============================
    // KARAKTERSZÁMLÁLÓ
    // ===============================


    comment.addEventListener("input", () => {


        counter.textContent =
            `${comment.value.length} / 500`;


    });








    // ===============================
    // TÖRLÉS
    // ===============================


    deleteButton.addEventListener("click", () => {


        URL.revokeObjectURL(videoURL);


        card.remove();


    });



}






// ===============================
// FÁJL MÉRET FORMÁZÁS
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
// PAGE TRANSITIONS
// ===============================


document.querySelectorAll("a").forEach(link => {


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


