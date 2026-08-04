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


const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const clipContainer = document.getElementById("clip-container");
const profileClipList = document.getElementById("profile-clip-list");

const SERVER_STATUS_URL = "https://m125gamedev.duckdns.org/active";
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

checkServerStatus();
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

    try {

        const result = await fetch("https://m125gamedev.duckdns.org", {

            method: "UPLOAD",

            headers: {
                "Content-Length": file.size,
                "Content-Type": "application/octet-stream",
                "filename": file.name
            },

            body: file

        });


        console.log("Feltöltve:", file.name);

        console.log(await result.text());


    } catch (error) {

        console.error("Feltöltési hiba:", error);

    }

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


