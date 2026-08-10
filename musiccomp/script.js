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

const DEFAULT_BG =
    "musics/default-bg.png";

const DEFAULT_COVER =
    "musics/covers/default.png";

const VOTED_ICON =
    "musics/covers/voted.png";


/*
    Candidate music:

    0 = completely silent when not hovered
    0.75 = volume when hovered
*/
const NORMAL_VOLUME =
    0;

const HOVER_VOLUME =
    0.75;


/*
    Background music.
*/
const BACKGROUND_VOLUME =
    0.15;


/*
    Fade durations.
*/
const AUDIO_FADE_DURATION =
    650;

const BACKGROUND_FADE_DURATION =
    900;


/* =========================================================
   STATE
========================================================= */

let songs = [];

let currentHoveredCard =
    null;

let audioUnlocked =
    false;


/*
    All candidate <audio> elements.
*/
const audios =
    new Set();


/*
    Currently running fade animations.

    This is important because if you move directly from
    Card A -> Card B, the old fade animation must be
    cancelled instead of fighting with the new one.
*/
const audioFadeAnimations =
    new Map();


/*
    Background fade animation.
*/
let backgroundFadeAnimation =
    null;


/*
    Background image change token.

    Prevents an old image preload from replacing a newer
    background when the user moves quickly between cards.
*/
let backgroundChangeToken =
    0;


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


    /*
        If the cover doesn't exist,
        use default.png.
    */
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


    votedIcon.onerror = () => {

        console.warn(
            `Voted icon nem található: ${VOTED_ICON}`
        );

    };


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


    /*
        Prevent card interaction from interfering
        when clicking the Spotify button.
    */
    spotify.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );


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


    /*
        IMPORTANT:

        Using the song ID is much safer than using
        the array index.

        If you reorder songs.json, votes won't move
        to another song.

        If "id" doesn't exist, fall back to index.
    */
    const voteIdentifier =
        song.id ??
        index;


    const voteKey =
        `musiccomp-vote-${voteIdentifier}`;


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


                vote.textContent =
                    "Vote";


                localStorage.removeItem(
                    voteKey
                );


                card.classList.remove(
                    "has-vote"
                );


                votes--;


            } else {

                vote.classList.add(
                    "voted"
                );


                vote.textContent =
                    "Voted";


                localStorage.setItem(
                    voteKey,
                    "true"
                );


                card.classList.add(
                    "has-vote"
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

    /*
        Immediately replace the currently hovered card.

        This means Card A -> Card B doesn't create a
        moment where the page thinks there is no hovered
        card.
    */
    currentHoveredCard =
        card;


    /* =====================================================
       BACKGROUND
    ====================================================== */

    changeBackground(
        cover.src
    );


    /* =====================================================
       DEFAULT BACKGROUND MUSIC
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

        /*
            Start ONLY if it has never been started.

            Once playing, it remains playing forever.
            We only change its volume.
        */
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

    /*
        IMPORTANT:

        If we immediately move to another card,
        mouseenter of the next card has already set
        currentHoveredCard to the new card.

        Therefore we should NOT reset the background
        music here if another card is already hovered.
    */

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

            /*
                Another card may have been entered
                between mouseleave and this frame.

                If so, DON'T restore the background music.
            */
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


    /*
        Every background change gets a unique token.

        If the user moves:

        A -> B -> C

        and A finishes loading after C,
        A will NOT overwrite C.
    */
    const token =
        ++backgroundChangeToken;


    const preload =
        new Image();


    preload.src =
        image;


    preload.onload =
        () => {

            if (
                token !==
                backgroundChangeToken
            ) {

                return;

            }


            if (
                currentHoveredCard
            ) {

                background.style.backgroundImage =
                    `url("${image}")`;

            }

        };


    /*
        Expanded-card background:
        less blur than the default background.
    */
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

    /*
        Invalidate old preloads.
    */
    backgroundChangeToken++;


    background.style.backgroundImage =
        `url("${DEFAULT_BG}")`;


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
        Already playing?

        DO NOT call play() again.

        This prevents the song from restarting
        every time the user hovers the card.
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


    /*
        Cancel previous fade for this exact audio.

        This is what fixes the stuttering / fighting
        animations when the mouse moves quickly.
    */
    const previousAnimation =
        audioFadeAnimations.get(
            audio
        );


    if (previousAnimation) {

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


        audioFadeAnimations.delete(
            audio
        );


        return;

    }


    const startTime =
        performance.now();


    let animationId =
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


        /*
            Smoothstep easing.
        */
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

            animationId =
                requestAnimationFrame(
                    animate
                );


            audioFadeAnimations.set(
                audio,
                animationId
            );


        } else {

            audio.volume =
                targetVolume;


            audioFadeAnimations.delete(
                audio
            );

        }

    }


    animationId =
        requestAnimationFrame(
            animate
        );


    audioFadeAnimations.set(
        audio,
        animationId
    );
}


/* =========================================================
   UNLOCK AUDIO
========================================================= */

/*
    Browsers block autoplay with sound.

    GitHub Pages itself is NOT the problem.

    The first real user interaction unlocks audio.
*/

function unlockAudio() {

    if (
        audioUnlocked
    ) {

        return;

    }


    audioUnlocked =
        true;


    console.log(
        "Audio unlocked."
    );


    /* =====================================================
       BACKGROUND MUSIC
    ====================================================== */

    backgroundMusic.volume =
        BACKGROUND_VOLUME;


    backgroundMusic
        .play()
        .catch(
            error => {

                console.debug(
                    "Background audio blocked:",
                    error
                );

            }
        );


    /* =====================================================
       CANDIDATE MUSIC
    ====================================================== */

    audios.forEach(
        audio => {

            /*
                Keep candidate songs silent until
                their card is hovered.
            */
            audio.volume =
                NORMAL_VOLUME;


            /*
                Start them once.

                From this point on, hover only changes
                volume and NEVER restarts the song.
            */
            audio.play()
                .catch(
                    error => {

                        console.debug(
                            "Candidate audio blocked:",
                            error
                        );

                    }
                );

        }
    );
}


/* =========================================================
   FIRST REAL USER INTERACTION
========================================================= */

/*
    IMPORTANT:

    pointerdown and keydown count as actual user
    interaction for browser autoplay policies.

    We intentionally DO NOT use pointermove here.
*/
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
   MOUSE WHEEL -> HORIZONTAL SCROLL
========================================================= */

musicList.addEventListener(
    "wheel",
    event => {

        /*
            If the user is primarily scrolling vertically,
            convert it to horizontal scrolling.
        */
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