/* =========================================================
   ELEMENTS
========================================================= */

const musicList =
    document.getElementById("music-list");

const background =
    document.getElementById("background");

const backgroundMusic =
    document.getElementById("background-music");


/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_COVER =
    "musics/covers/default.png";


const DEFAULT_BACKGROUND =
    "musics/default-bg.png";


/*
    A kártyák zenéje alapból teljesen néma.
    Hoverkor felhangosodik.
*/
const NORMAL_VOLUME =
    0;


const HOVER_VOLUME =
    0.75;


/*
    A default háttérzene normál hangereje.
*/
const BACKGROUND_VOLUME =
    0.15;


const AUDIO_FADE_DURATION =
    650;


const BACKGROUND_FADE_DURATION =
    900;


/* =========================================================
   STATE
========================================================= */

let songs =
    [];

let currentHoveredCard =
    null;

let audioUnlocked =
    false;

const audios =
    new Set();


/* =========================================================
   LOAD SONGS
========================================================= */

async function loadSongs() {

    try {

        const response =
            await fetch("songs.json");


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        songs =
            await response.json();


        if (!Array.isArray(songs)) {

            throw new Error(
                "A songs.json formátuma hibás."
            );

        }


        songs.forEach(
            createCard
        );


        console.log(
            `${songs.length} jelölt betöltve.`
        );


    } catch (error) {

        console.error(
            "Nem sikerült betölteni a songs.json fájlt:",
            error
        );

    }

}


/* =========================================================
   CREATE CARD
========================================================= */

function createCard(
    song,
    index
) {

    const card =
        document.createElement("article");


    card.className =
        "music-card";


    card.dataset.index =
        index;


    /* =====================================================
       COVER
    ====================================================== */

    const cover =
        document.createElement("img");


    cover.className =
        "cover";


    const coverURL =
        song.cover ||
        DEFAULT_COVER;


    cover.src =
        coverURL;


    cover.alt =
        `${song.title || "Unknown"} cover`;


    cover.loading =
        "lazy";


    cover.onerror = () => {

        cover.src =
            DEFAULT_COVER;


        card.style.setProperty(
            "--cover",
            `url("${DEFAULT_COVER}")`
        );

    };


    card.style.setProperty(
        "--cover",
        `url("${coverURL}")`
    );


    /* =====================================================
       AUDIO
    ====================================================== */

    let audio =
        null;


    if (song.preview) {

        audio =
            document.createElement("audio");


        audio.src =
            song.preview;


        audio.loop =
            true;


        audio.preload =
            "auto";


        audio.volume =
            NORMAL_VOLUME;


        audio.setAttribute(
            "aria-hidden",
            "true"
        );


        audio.style.display =
            "none";


        card.appendChild(
            audio
        );


        audios.add(
            audio
        );

    }


    /* =====================================================
       INFO
    ====================================================== */

    const info =
        document.createElement("div");


    info.className =
        "info";


    /* =====================================================
       TITLE
    ====================================================== */

    const title =
        document.createElement("h2");


    title.textContent =
        song.title ||
        "Unknown title";


    /* =====================================================
       ARTIST
    ====================================================== */

    const artist =
        document.createElement("p");


    artist.textContent =
        song.artist ||
        "Unknown artist";


    /* =====================================================
       DESCRIPTION
    ====================================================== */

    let description =
        null;


    if (song.description) {

        description =
            document.createElement("div");


        description.className =
            "description";


        description.textContent =
            song.description;

    }


    /* =====================================================
       META
    ====================================================== */

    const meta =
        document.createElement("div");


    meta.className =
        "info-meta";


    if (song.album) {

        const album =
            document.createElement("span");


        album.textContent =
            song.album;


        meta.appendChild(
            album
        );

    }


    if (song.year) {

        const year =
            document.createElement("span");


        year.textContent =
            song.year;


        meta.appendChild(
            year
        );

    }


    if (song.genre) {

        const genre =
            document.createElement("span");


        genre.textContent =
            song.genre;


        meta.appendChild(
            genre
        );

    }


    /* =====================================================
       ACTIONS
    ====================================================== */

    const actions =
        document.createElement("div");


    actions.className =
        "card-actions";


    /* =====================================================
       SPOTIFY BUTTON
    ====================================================== */

    const spotify =
        document.createElement("a");


    spotify.className =
        "spotify-button";


    spotify.href =
        song.spotify ||
        "#";


    spotify.target =
        "_blank";


    spotify.rel =
        "noopener noreferrer";


    spotify.textContent =
        "Open on Spotify ↗";


    /* =====================================================
       VOTE BUTTON
    ====================================================== */

    const vote =
        document.createElement("button");


    vote.className =
        "vote-button";


    vote.type =
        "button";


    vote.textContent =
        "Vote";


    vote.setAttribute(
        "aria-label",
        `Vote for ${song.title || "this song"}`
    );


    let votes =
        Number(song.votes) ||
        0;


    const voteKey =
        `musiccomp-vote-${index}`;


    const alreadyVoted =
        localStorage.getItem(
            voteKey
        ) === "true";


    /* =====================================================
       VOTED PILL
    ====================================================== */

    const votedPill =
        document.createElement("div");


    votedPill.className =
        "voted-pill";


    const votedIcon =
        document.createElement("img");


    votedIcon.src =
        "musics/covers/voted.png";


    votedIcon.alt =
        "";


    const votedText =
        document.createElement("span");


    votedText.textContent =
        "Voted";


    votedPill.appendChild(
        votedIcon
    );


    votedPill.appendChild(
        votedText
    );


    card.appendChild(
        votedPill
    );


    /* =====================================================
       RESTORE VOTE
    ====================================================== */

    if (alreadyVoted) {

        vote.classList.add(
            "voted"
        );

        vote.textContent =
            "Voted";

        card.classList.add(
            "has-vote"
        );

    }


    /* =====================================================
       VOTE EVENT
    ====================================================== */

    vote.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const hasVoted =
                vote.classList.contains(
                    "voted"
                );


            /* ---------------------------------------------
               REMOVE VOTE
            ---------------------------------------------- */

            if (hasVoted) {

                vote.classList.remove(
                    "voted"
                );


                vote.textContent =
                    "Vote";


                card.classList.remove(
                    "has-vote"
                );


                localStorage.removeItem(
                    voteKey
                );


                votes--;


            }


            /* ---------------------------------------------
               ADD VOTE
            ---------------------------------------------- */

            else {

                vote.classList.add(
                    "voted"
                );


                vote.textContent =
                    "Voted";


                card.classList.add(
                    "has-vote"
                );


                localStorage.setItem(
                    voteKey,
                    "true"
                );


                votes++;

            }


            console.log(
                `"${song.title}" votes: ${votes}`
            );

        }
    );


    /* =====================================================
       ACTIONS
    ====================================================== */

    actions.appendChild(
        spotify
    );


    actions.appendChild(
        vote
    );


    /* =====================================================
       BUILD INFO
    ====================================================== */

    info.appendChild(
        title
    );


    info.appendChild(
        artist
    );


    if (description) {

        info.appendChild(
            description
        );

    }


    if (
        meta.children.length > 0
    ) {

        info.appendChild(
            meta
        );

    }


    info.appendChild(
        actions
    );


    /* =====================================================
       BUILD CARD
    ====================================================== */

    card.appendChild(
        cover
    );


    card.appendChild(
        info
    );


    musicList.appendChild(
        card
    );


    /* =====================================================
       HOVER ENTER
    ====================================================== */

    card.addEventListener(
        "mouseenter",
        () => {

            handleCardEnter(
                card,
                cover,
                audio
            );

        }
    );


    /* =====================================================
       HOVER LEAVE
    ====================================================== */

    card.addEventListener(
        "mouseleave",
        () => {

            handleCardLeave(
                card,
                audio
            );

        }
    );

}


/* =========================================================
   CARD ENTER
========================================================= */

function handleCardEnter(
    card,
    cover,
    audio
) {

    currentHoveredCard =
        card;


    /* =====================================================
       BACKGROUND
    ====================================================== */

    changeBackground(
        cover.src
    );


    /* =====================================================
       DEFAULT MUSIC
    ====================================================== */

    fadeAudio(
        backgroundMusic,
        0,
        BACKGROUND_FADE_DURATION
    );


    /* =====================================================
       CARD AUDIO
    ====================================================== */

    if (audio) {

        startAudioIfNeeded(
            audio
        );


        fadeAudio(
            audio,
            HOVER_VOLUME,
            AUDIO_FADE_DURATION
        );


        card.classList.add(
            "is-playing"
        );

    }

}


/* =========================================================
   CARD LEAVE
========================================================= */

function handleCardLeave(
    card,
    audio
) {

    if (
        currentHoveredCard === card
    ) {

        currentHoveredCard =
            null;

    }


    /* =====================================================
       CARD AUDIO
    ====================================================== */

    if (audio) {

        fadeAudio(
            audio,
            NORMAL_VOLUME,
            AUDIO_FADE_DURATION
        );


        card.classList.remove(
            "is-playing"
        );

    }


    /* =====================================================
       BACKGROUND MUSIC
    ====================================================== */

    requestAnimationFrame(
        () => {

            if (
                !currentHoveredCard
            ) {

                fadeAudio(
                    backgroundMusic,
                    BACKGROUND_VOLUME,
                    BACKGROUND_FADE_DURATION
                );


                resetBackground();

            }

        }
    );

}


/* =========================================================
   CHANGE BACKGROUND
========================================================= */

function changeBackground(
    image
) {

    if (!image) {

        image =
            DEFAULT_COVER;

    }


    const preload =
        new Image();


    preload.src =
        image;


    preload.onload =
        () => {

            if (
                currentHoveredCard
            ) {

                background.style.backgroundImage =
                    `url("${image}")`;

            }

        };


    /*
        Hover background blur.
        Ezt az értéket tudod állítani.
    */
    background.style.filter =
        "blur(5px)";


    /*
        Hover background zoom.
    */
    background.style.transform =
        "scale(1.06)";


    background.style.opacity =
        "0.52";

}


/* =========================================================
   RESET BACKGROUND
========================================================= */

function resetBackground() {

    background.style.backgroundImage =
        `url("${DEFAULT_BACKGROUND}")`;


    background.style.filter =
        "blur(75px)";


    background.style.transform =
        "scale(1.12)";


    background.style.opacity =
        "0.42";

}


/* =========================================================
   START AUDIO
========================================================= */

function startAudioIfNeeded(
    audio
) {

    if (!audio) {

        return;

    }


    /*
        Ha már játszik,
        NEM indítjuk újra.
    */

    if (
        !audio.paused
    ) {

        return;

    }


    audio.play()
        .catch(
            error => {

                console.debug(
                    "Audio autoplay blocked:",
                    error
                );

            }
        );

}


/* =========================================================
   FADE AUDIO
========================================================= */

function fadeAudio(
    audio,
    targetVolume,
    duration = 600
) {

    if (!audio) {

        return;

    }


    const startVolume =
        audio.volume;


    const difference =
        targetVolume -
        startVolume;


    if (
        Math.abs(difference)
        < 0.001
    ) {

        audio.volume =
            targetVolume;

        return;

    }


    const startTime =
        performance.now();


    function animate(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        const progress =
            Math.min(
                elapsed / duration,
                1
            );


        const eased =
            progress *
            progress *
            (3 - 2 * progress);


        audio.volume =
            startVolume +
            difference *
            eased;


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                animate
            );

        } else {

            audio.volume =
                targetVolume;

        }

    }


    requestAnimationFrame(
        animate
    );

}


/* =========================================================
   UNLOCK AUDIO
========================================================= */

function unlockAudio() {

    if (
        audioUnlocked
    ) {

        return;

    }


    audioUnlocked =
        true;


    /* =====================================================
       BACKGROUND MUSIC
    ====================================================== */

    backgroundMusic.volume =
        BACKGROUND_VOLUME;


    backgroundMusic
        .play()
        .catch(
            () => {}
        );


    /* =====================================================
       ALL CANDIDATE MUSIC
    ====================================================== */

    audios.forEach(
        audio => {

            audio.volume =
                NORMAL_VOLUME;


            audio.play()
                .catch(
                    () => {}
                );

        }
    );

}


/* =========================================================
   FIRST USER INTERACTION
========================================================= */

document.addEventListener(
    "pointerdown",
    unlockAudio,
    {
        once: true
    }
);


document.addEventListener(
    "keydown",
    unlockAudio,
    {
        once: true
    }
);


document.addEventListener(
    "pointermove",
    unlockAudio,
    {
        once: true
    }
);


/* =========================================================
   MOUSE WHEEL → HORIZONTAL SCROLL
========================================================= */

musicList.addEventListener(
    "wheel",
    event => {

        if (
            Math.abs(event.deltaY)
            >
            Math.abs(event.deltaX)
        ) {

            event.preventDefault();


            musicList.scrollLeft +=
                event.deltaY;

        }

    },
    {
        passive: false
    }
);


/* =========================================================
   LOAD
========================================================= */

loadSongs();