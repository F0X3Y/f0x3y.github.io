/* =========================================================
   ELEMENTS
========================================================= */

const musicList =
    document.getElementById("music-list");

const background =
    document.getElementById("background");

const backgroundMusic =
    document.getElementById("background-music");

const musicPlayer =
    document.getElementById("music-player");

const playerGif =
    document.getElementById("player-gif");

const loader =
    document.getElementById("loader");


/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_COVER =
    "musics/covers/default.png";

const DEFAULT_BACKGROUND =
    "musics/default-bg.png";

const VOTED_ICON =
    "musics/voted.png";


const NORMAL_VOLUME =
    0.0;


const HOVER_VOLUME =
    0.75;


const BACKGROUND_VOLUME =
    0.15;


const BACKGROUND_FADE_OUT =
    650;


const BACKGROUND_FADE_IN =
    900;


const AUDIO_FADE_DURATION =
    650;


/*
    GIF-ek hossza:

    1170 / 2 = 585 ms
*/

const PLAY_ANIMATION_DURATION =
    585;

const PAUSE_ANIMATION_DURATION =
    585;


/* =========================================================
   STATE
========================================================= */

let songs = [];

let currentHoveredCard =
    null;

let backgroundMusicEnabled =
    false;

let audioUnlocked =
    false;


/*
    Az összes candidate audio.
*/

const audios =
    new Set();


/*
    Fade animationek tárolása.
*/

const fadeAnimations =
    new WeakMap();


/* =========================================================
   ASSET PRELOADING
========================================================= */

function preloadImage(src) {

    return new Promise(
        resolve => {

            const image =
                new Image();


            image.onload =
                resolve;


            image.onerror =
                resolve;


            image.src =
                src;

        }
    );

}


async function preloadAssets() {

    const assets = [];


    /* =====================================================
       STATIC ASSETS
    ====================================================== */

    assets.push(

        DEFAULT_COVER,

        DEFAULT_BACKGROUND,

        VOTED_ICON,

        "musics/play.jpg",

        "musics/pause.jpg",

        "musics/play-pause.gif",

        "musics/pause-play.gif"

    );


    /* =====================================================
       SONG COVERS
    ====================================================== */

    songs.forEach(
        song => {

            if (song.cover) {

                assets.push(
                    song.cover
                );

            }

        }
    );


    /*
        Duplikációk kiszűrése.
    */

    const uniqueAssets =
        [
            ...new Set(
                assets
            )
        ];


    console.log(
        `Preloading ${uniqueAssets.length} assets...`
    );


    /* =====================================================
       LOAD ALL
    ====================================================== */

    await Promise.all(

        uniqueAssets.map(
            preloadImage
        )

    );


    console.log(
        "All image assets loaded."
    );

}


/* =========================================================
   HIDE LOADER
========================================================= */

function hideLoader() {

    loader.classList.add(
        "loaded"
    );

}


/* =========================================================
   LOAD SONGS
========================================================= */

async function loadSongs() {

    try {

        const response =
            await fetch(
                "songs.json"
            );


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


        /*
            Először minden assetet betöltünk.
        */

        await preloadAssets();


        /*
            Csak ezután építjük fel
            a cardokat.
        */

        songs.forEach(
            createCard
        );


        console.log(
            `${songs.length} jelölt betöltve.`
        );


        /*
            Rövid frame-halasztás,
            hogy a cardok ténylegesen
            bekerüljenek a DOM-ba.
        */

        requestAnimationFrame(
            () => {

                requestAnimationFrame(
                    hideLoader
                );

            }
        );


    } catch (error) {

        console.error(
            "Nem sikerült betölteni a songs.json fájlt:",
            error
        );


        /*
            Ha valami elromlik,
            akkor se maradjon örökre
            a loading screen.
        */

        hideLoader();

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
       VOTED PILL
    ====================================================== */

    const votedPill =
        document.createElement("div");


    votedPill.className =
        "voted-pill";


    const votedIcon =
        document.createElement("img");


    votedIcon.src =
        VOTED_ICON;


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
       SPOTIFY
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
       VOTE
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
        `musiccomp-vote-${
            song.spotify ||
            index
        }`;


    const alreadyVoted =
        localStorage.getItem(
            voteKey
        ) === "true";


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


    vote.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const hasVoted =
                vote.classList.contains(
                    "voted"
                );


            if (hasVoted) {

                vote.classList.remove(
                    "voted"
                );


                card.classList.remove(
                    "has-vote"
                );


                vote.textContent =
                    "Vote";


                localStorage.removeItem(
                    voteKey
                );


                votes--;


            } else {

                vote.classList.add(
                    "voted"
                );


                card.classList.add(
                    "has-vote"
                );


                vote.textContent =
                    "Voted";


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
       BUILD ACTIONS
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
       BACKGROUND MUSIC
    ====================================================== */

    if (
        backgroundMusicEnabled
    ) {

        fadeAudio(
            backgroundMusic,
            0,
            BACKGROUND_FADE_OUT
        );

    }


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
        audio
    ) {

        fadeAudio(
            audio,
            NORMAL_VOLUME,
            AUDIO_FADE_DURATION
        );


        card.classList.remove(
            "is-playing"
        );

    }


    requestAnimationFrame(
        () => {

            if (
                currentHoveredCard === card
            ) {

                currentHoveredCard =
                    null;


                if (
                    backgroundMusicEnabled
                ) {

                    fadeAudio(
                        backgroundMusic,
                        BACKGROUND_VOLUME,
                        BACKGROUND_FADE_IN
                    );

                }


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


    background.style.filter =
        "blur(5px)";


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


    if (
        !audio.paused
    ) {

        return;

    }


    audio.play()
        .catch(
            error => {

                console.debug(
                    "Candidate audio autoplay blocked:",
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


    const previousAnimation =
        fadeAnimations.get(
            audio
        );


    if (
        previousAnimation
    ) {

        cancelAnimationFrame(
            previousAnimation
        );

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


    let animationID =
        null;


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

            animationID =
                requestAnimationFrame(
                    animate
                );


            fadeAnimations.set(
                audio,
                animationID
            );


        } else {

            audio.volume =
                targetVolume;


            fadeAnimations.delete(
                audio
            );

        }

    }


    animationID =
        requestAnimationFrame(
            animate
        );


    fadeAnimations.set(
        audio,
        animationID
    );

}


/* =========================================================
   PLAYER GIF
========================================================= */

function setPlayerGif(
    playing
) {

    if (
        playing
    ) {

        playerGif.src =
            "musics/play-pause.gif";


        setTimeout(
            () => {

                /*
                    Csak akkor váltunk pause.jpg-re,
                    ha még mindig játszik a zene.
                */

                if (
                    backgroundMusicEnabled
                ) {

                    playerGif.src =
                        "musics/pause.jpg";

                }

            },
            PLAY_ANIMATION_DURATION
        );


    } else {

        playerGif.src =
            "musics/pause-play.gif";


        setTimeout(
            () => {

                /*
                    Csak akkor váltunk play.jpg-re,
                    ha még mindig ki van kapcsolva.
                */

                if (
                    !backgroundMusicEnabled
                ) {

                    playerGif.src =
                        "musics/play.jpg";

                }

            },
            PAUSE_ANIMATION_DURATION
        );

    }

}


/* =========================================================
   MUSIC PLAYER
========================================================= */

musicPlayer.addEventListener(
    "click",
    async () => {

        audioUnlocked =
            true;


        /* =================================================
           TURN OFF
        ================================================== */

        if (
            backgroundMusicEnabled
        ) {

            backgroundMusicEnabled =
                false;


            fadeAudio(
                backgroundMusic,
                0,
                450
            );


            musicPlayer.classList.remove(
                "playing"
            );


            musicPlayer.setAttribute(
                "aria-label",
                "Play background music"
            );


            setPlayerGif(
                false
            );


            return;

        }


        /* =================================================
           TURN ON
        ================================================== */

        backgroundMusicEnabled =
            true;


        try {

            if (
                !currentHoveredCard
            ) {

                backgroundMusic.volume =
                    0;


                await backgroundMusic.play();


                fadeAudio(
                    backgroundMusic,
                    BACKGROUND_VOLUME,
                    900
                );

            }

        } catch (error) {

            console.debug(
                "Background music playback failed:",
                error
            );


            backgroundMusicEnabled =
                false;


            return;

        }


        musicPlayer.classList.add(
            "playing"
        );


        musicPlayer.setAttribute(
            "aria-label",
            "Pause background music"
        );


        setPlayerGif(
            true
        );

    }
);


/* =========================================================
   FIRST USER INTERACTION
========================================================= */

function unlockAudio() {

    if (
        audioUnlocked
    ) {

        return;

    }


    audioUnlocked =
        true;

}


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
   INITIAL STATE
========================================================= */

backgroundMusic.volume =
    0;

backgroundMusicEnabled =
    false;


/*
    Alapból a pause-play GIF indul,
    majd 585 ms után play.jpg lesz.
*/

setPlayerGif(
    false
);


resetBackground();


/* =========================================================
   LOAD
========================================================= */

loadSongs();