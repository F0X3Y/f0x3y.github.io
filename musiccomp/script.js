const musicList = document.getElementById("music-list");
const background = document.getElementById("background");
const backgroundMusic = document.getElementById("background-music");
const musicPlayer = document.getElementById("music-player");
const playerGif = document.getElementById("player-gif");
const loader = document.getElementById("loader");


// ============================================================
// SETTINGS
// ============================================================

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


const PLAY_ANIMATION_DURATION =
    585;

const PAUSE_ANIMATION_DURATION =
    585;


// ============================================================
// STATE
// ============================================================

let currentAudio =
    null;

let currentCard =
    null;

let backgroundMusicEnabled =
    false;

let backgroundMusicFadeFrame =
    null;

let backgroundChangeToken =
    0;


// ============================================================
// HELPERS
// ============================================================

function clamp(
    value,
    min,
    max
) {

    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );

}


function sleep(ms) {

    return new Promise(
        resolve => {

            setTimeout(
                resolve,
                ms
            );

        }
    );

}


// ============================================================
// AUDIO FADE
// ============================================================

function fadeAudio(
    audio,
    targetVolume,
    duration = AUDIO_FADE_DURATION
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
        Math.abs(difference) <
        0.001
    ) {

        audio.volume =
            targetVolume;

        return;
    }


    const startTime =
        performance.now();


    function update(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        const progress =
            clamp(
                elapsed /
                duration,
                0,
                1
            );


        audio.volume =
            startVolume +
            difference *
            progress;


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                update
            );

        } else {

            audio.volume =
                targetVolume;

        }

    }


    requestAnimationFrame(
        update
    );

}


// ============================================================
// BACKGROUND MUSIC FADE
// ============================================================

function fadeBackgroundMusic(
    targetVolume,
    duration
) {

    if (!backgroundMusic) {
        return;
    }


    if (
        backgroundMusicFadeFrame !==
        null
    ) {

        cancelAnimationFrame(
            backgroundMusicFadeFrame
        );

        backgroundMusicFadeFrame =
            null;
    }


    const startVolume =
        backgroundMusic.volume;

    const difference =
        targetVolume -
        startVolume;

    const startTime =
        performance.now();


    function update(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        const progress =
            clamp(
                elapsed /
                duration,
                0,
                1
            );


        backgroundMusic.volume =
            startVolume +
            difference *
            progress;


        if (
            progress < 1
        ) {

            backgroundMusicFadeFrame =
                requestAnimationFrame(
                    update
                );

        } else {

            backgroundMusic.volume =
                targetVolume;

            backgroundMusicFadeFrame =
                null;

        }

    }


    backgroundMusicFadeFrame =
        requestAnimationFrame(
            update
        );

}


// ============================================================
// IMAGE PRELOAD
// ============================================================

function preloadImage(src) {

    return new Promise(
        resolve => {

            if (!src) {

                resolve();

                return;
            }


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


// ============================================================
// AUDIO PRELOAD
// ============================================================

function preloadAudio(src) {

    return new Promise(
        resolve => {

            if (!src) {

                resolve();

                return;
            }


            const audio =
                new Audio();


            audio.preload =
                "auto";


            const done =
                () => {

                    resolve();

                };


            audio.addEventListener(
                "canplaythrough",
                done,
                {
                    once: true
                }
            );


            audio.addEventListener(
                "error",
                done,
                {
                    once: true
                }
            );


            audio.src =
                src;

            audio.load();

        }
    );

}


// ============================================================
// PRELOAD ASSETS
// ============================================================

async function preloadAssets(
    songs
) {

    const images = [

        DEFAULT_COVER,

        DEFAULT_BACKGROUND,

        VOTED_ICON

    ];


    const audios =
        [];


    for (
        const song
        of songs
    ) {

        if (song.cover) {

            images.push(
                song.cover
            );

        }


        if (song.preview) {

            audios.push(
                song.preview
            );

        }

    }


    const uniqueImages =
        [
            ...new Set(
                images
            )
        ];


    const uniqueAudios =
        [
            ...new Set(
                audios
            )
        ];


    await Promise.all([

        ...uniqueImages.map(
            preloadImage
        ),

        ...uniqueAudios.map(
            preloadAudio
        )

    ]);

}


// ============================================================
// BACKGROUND
// ============================================================

async function changeBackground(
    image
) {

    if (!image) {

        image =
            DEFAULT_BACKGROUND;

    }


    const token =
        ++backgroundChangeToken;


    await preloadImage(
        image
    );


    if (
        token !==
        backgroundChangeToken
    ) {

        return;

    }


    background.classList.add(
        "changing"
    );


    await sleep(
        120
    );


    if (
        token !==
        backgroundChangeToken
    ) {

        return;

    }


    background.style.backgroundImage =
        `url("${image}")`;


    background.classList.remove(
        "changing"
    );

}


// ============================================================
// RESET BACKGROUND
// ============================================================

function resetBackground() {

    backgroundChangeToken++;


    background.style.backgroundImage =
        `url("${DEFAULT_BACKGROUND}")`;


    background.classList.remove(
        "changing"
    );

}


// ============================================================
// CARD AUDIO
// ============================================================

async function startCardAudio(
    card
) {

    const audio =
        card.querySelector(
            ".card-audio"
        );


    if (!audio) {

        return;

    }


    /*
        If another card is currently audible,
        fade it to zero.

        IMPORTANT:
        We DO NOT pause it.
        It keeps playing silently.
    */
    if (
        currentAudio &&
        currentAudio !== audio
    ) {

        fadeAudio(
            currentAudio,
            NORMAL_VOLUME,
            AUDIO_FADE_DURATION
        );

    }


    currentAudio =
        audio;

    currentCard =
        card;


    /*
        If the preview already finished,
        restart it from the beginning.
    */
    if (
        audio.ended
    ) {

        audio.currentTime =
            0;

    }


    /*
        If for some reason it is paused,
        start it.

        Normally this only happens on the
        first hover.
    */
    if (
        audio.paused
    ) {

        try {

            await audio.play();

        } catch (error) {

            console.warn(
                "Could not play preview:",
                error
            );

            return;

        }

    }


    /*
        Bring the currently hovered card back
        to audible volume.
    */
    fadeAudio(
        audio,
        HOVER_VOLUME,
        AUDIO_FADE_DURATION
    );

}


// ============================================================
// STOP / MUTE CARD AUDIO
// ============================================================

function stopCardAudio(
    card
) {

    const audio =
        card.querySelector(
            ".card-audio"
        );


    if (!audio) {

        return;

    }


    /*
        IMPORTANT:

        Do NOT pause.
        Do NOT reset currentTime.

        The song continues playing in the
        background at zero volume.
    */
    fadeAudio(
        audio,
        NORMAL_VOLUME,
        AUDIO_FADE_DURATION
    );


    /*
        Do not clear currentAudio here.

        The card can still be the currently
        tracked audio even while its volume
        is zero.
    */

}


// ============================================================
// CARD AUDIO ENDED
// ============================================================

function handleCardAudioEnded(
    card,
    audio
) {

    /*
        If the mouse is STILL over this card,
        immediately restart the preview.
    */
    if (
        card.matches(":hover")
    ) {

        audio.currentTime =
            0;


        audio.volume =
            NORMAL_VOLUME;


        audio.play()
            .then(
                () => {

                    fadeAudio(
                        audio,
                        HOVER_VOLUME,
                        AUDIO_FADE_DURATION
                    );

                }
            )
            .catch(
                error => {

                    console.warn(
                        "Could not restart preview:",
                        error
                    );

                }
            );

    }

}


// ============================================================
// CARD HOVER
// ============================================================

async function handleCardEnter(
    card,
    song
) {

    /*
        Start background rotation.
    */
    background.classList.add(
        "card-hover"
    );


    /*
        Change page background.
    */
    await changeBackground(
        song.cover ||
        DEFAULT_BACKGROUND
    );


    /*
        Background music fades out.
    */
    fadeBackgroundMusic(
        0,
        BACKGROUND_FADE_OUT
    );


    /*
        Start/resume the card audio.

        If it already played silently after leaving
        the card, it continues.

        If it already ended, it starts again.
    */
    await startCardAudio(
        card
    );

}


function handleCardLeave(
    card
) {

    /*
        Stop background rotation,
        but keep the current rotation position.
    */
    background.classList.remove(
        "card-hover"
    );


    /*
        Keep audio playing,
        but make it silent.
    */
    stopCardAudio(
        card
    );


    /*
        Background music comes back.
    */
    fadeBackgroundMusic(
        backgroundMusicEnabled
            ? BACKGROUND_VOLUME
            : 0,
        BACKGROUND_FADE_IN
    );


    /*
        Restore default background.
    */
    resetBackground();

}


// ============================================================
// VOTE
// ============================================================

function getVoteKey(
    song,
    index
) {

    return `musiccomp-vote-${
        song.spotify ||
        index
    }`;

}


function updateVoteButton(
    button,
    voted
) {

    if (voted) {

        button.classList.add(
            "voted"
        );


        button.innerHTML = `
            <img
                src="${VOTED_ICON}"
                alt=""
            >
            Voted
        `;

    } else {

        button.classList.remove(
            "voted"
        );


        button.textContent =
            "Vote";

    }

}


function setupVoteButton(
    button,
    song,
    index
) {

    const voteKey =
        getVoteKey(
            song,
            index
        );


    const savedVote =
        localStorage.getItem(
            voteKey
        ) === "true";


    updateVoteButton(
        button,
        savedVote
    );


    if (savedVote) {

        button
            .closest(
                ".music-card"
            )
            ?.classList.add(
                "has-vote"
            );

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            const currentlyVoted =
                localStorage.getItem(
                    voteKey
                ) === "true";


            const newState =
                !currentlyVoted;


            localStorage.setItem(
                voteKey,
                newState
            );


            updateVoteButton(
                button,
                newState
            );


            const card =
                button.closest(
                    ".music-card"
                );


            if (card) {

                card.classList.toggle(
                    "has-vote",
                    newState
                );

            }

        }
    );

}


// ============================================================
// CREATE CARD
// ============================================================

function createCard(
    song,
    index
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "music-card";


    const cover =
        song.cover ||
        DEFAULT_COVER;


    const title =
        song.title ||
        "Unknown title";


    const artist =
        song.artist ||
        "Unknown artist";


    const description =
        song.description ||
        "";


    const album =
        song.album ||
        "";


    const year =
        song.year ||
        "";


    const genre =
        song.genre ||
        "";


    const spotify =
        song.spotify ||
        "#";


    /*
        Card blurred background image.
    */
    card.style.setProperty(
        "--card-image",
        `url("${cover}")`
    );


    card.style.backgroundImage =
        `url("${cover}")`;


    // ========================================================
    // COVER
    // ========================================================

    const coverElement =
        document.createElement(
            "div"
        );


    coverElement.className =
        "cover";


    // ========================================================
    // VOTED PILL
    // ========================================================

    const votedPill =
        document.createElement(
            "div"
        );


    votedPill.className =
        "voted-pill";


    votedPill.innerHTML = `
        <img
            src="${VOTED_ICON}"
            alt=""
        >
        Voted
    `;


    coverElement.appendChild(
        votedPill
    );


    // ========================================================
    // AUDIO
    // ========================================================

    if (song.preview) {

        const audio =
            document.createElement(
                "audio"
            );


        audio.className =
            "card-audio";


        audio.src =
            song.preview;


        audio.preload =
            "auto";


        audio.volume =
            NORMAL_VOLUME;


        /*
            When the song reaches the end:

            - hovered -> restart
            - not hovered -> stay ended
        */
        audio.addEventListener(
            "ended",
            () => {

                handleCardAudioEnded(
                    card,
                    audio
                );

            }
        );


        card.appendChild(
            audio
        );

    }


    // ========================================================
    // INFO
    // ========================================================

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "info";


    // ========================================================
    // TITLE
    // ========================================================

    const titleElement =
        document.createElement(
            "h2"
        );


    titleElement.className =
        "song-title";


    titleElement.textContent =
        title;


    info.appendChild(
        titleElement
    );


    // ========================================================
    // ARTIST
    // ========================================================

    const artistElement =
        document.createElement(
            "div"
        );


    artistElement.className =
        "artist";


    artistElement.textContent =
        artist;


    info.appendChild(
        artistElement
    );


    // ========================================================
    // DESCRIPTION
    // ========================================================

    if (description) {

        const descriptionElement =
            document.createElement(
                "p"
            );


        descriptionElement.className =
            "description";


        descriptionElement.textContent =
            description;


        info.appendChild(
            descriptionElement
        );

    }


    // ========================================================
    // META
    // ========================================================

    if (
        album ||
        year ||
        genre
    ) {

        const meta =
            document.createElement(
                "div"
            );


        meta.className =
            "meta";


        if (album) {

            const element =
                document.createElement(
                    "span"
                );


            element.textContent =
                album;


            meta.appendChild(
                element
            );

        }


        if (year) {

            const element =
                document.createElement(
                    "span"
                );


            element.textContent =
                year;


            meta.appendChild(
                element
            );

        }


        if (genre) {

            const element =
                document.createElement(
                    "span"
                );


            element.textContent =
                genre;


            meta.appendChild(
                element
            );

        }


        info.appendChild(
            meta
        );

    }


    // ========================================================
    // ACTIONS
    // ========================================================

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "card-actions";


    // ========================================================
    // SPOTIFY
    // ========================================================

    const spotifyButton =
        document.createElement(
            "a"
        );


    spotifyButton.className =
        "spotify-button";


    spotifyButton.href =
        spotify;


    spotifyButton.target =
        "_blank";


    spotifyButton.rel =
        "noopener noreferrer";


    spotifyButton.textContent =
        "Open in Spotify";


    actions.appendChild(
        spotifyButton
    );


    // ========================================================
    // VOTE
    // ========================================================

    const voteButton =
        document.createElement(
            "button"
        );


    voteButton.className =
        "vote-button";


    voteButton.type =
        "button";


    voteButton.textContent =
        "Vote";


    actions.appendChild(
        voteButton
    );


    // ========================================================
    // APPEND
    // ========================================================

    info.appendChild(
        actions
    );


    card.appendChild(
        coverElement
    );


    card.appendChild(
        info
    );


    musicList.appendChild(
        card
    );


    // ========================================================
    // VOTE STATE
    // ========================================================

    setupVoteButton(
        voteButton,
        song,
        index
    );


    // ========================================================
    // HOVER
    // ========================================================

    card.addEventListener(
        "mouseenter",
        () => {

            handleCardEnter(
                card,
                song
            );

        }
    );


    card.addEventListener(
        "mouseleave",
        () => {

            handleCardLeave(
                card
            );

        }
    );


    return card;

}


// ============================================================
// LOAD SONGS
// ============================================================

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


        const songs =
            await response.json();


        // ----------------------------------------------------
        // PRELOAD
        // ----------------------------------------------------

        await preloadAssets(
            songs
        );


        // ----------------------------------------------------
        // CARDS
        // ----------------------------------------------------

        musicList.innerHTML =
            "";


        songs.forEach(
            (
                song,
                index
            ) => {

                createCard(
                    song,
                    index
                );

            }
        );


        // ----------------------------------------------------
        // LOADER
        // ----------------------------------------------------

        loader.classList.add(
            "loaded"
        );


        setTimeout(
            () => {

                loader.style.display =
                    "none";

            },
            600
        );


    } catch (error) {

        console.error(
            "Failed to load songs:",
            error
        );


        loader.classList.add(
            "error"
        );


        const loaderText =
            loader.querySelector(
                ".loader-text"
            );


        if (loaderText) {

            loaderText.textContent =
                "FAILED TO LOAD SONGS";

        }

    }

}


// ============================================================
// BACKGROUND MUSIC PLAYER
// ============================================================

async function playBackgroundMusic() {

    try {

        await backgroundMusic.play();


        backgroundMusicEnabled =
            true;


        backgroundMusic.volume =
            0;


        musicPlayer.classList.add(
            "playing"
        );


        fadeBackgroundMusic(
            BACKGROUND_VOLUME,
            BACKGROUND_FADE_IN
        );


        // ----------------------------------------------------
        // PLAY -> PAUSE GIF
        // ----------------------------------------------------

        playerGif.src =
            "musics/pause-play.gif";


        setTimeout(
            () => {

                if (
                    backgroundMusicEnabled
                ) {

                    playerGif.src =
                        "musics/pause.jpg";

                }

            },
            PLAY_ANIMATION_DURATION
        );


    } catch (error) {

        console.warn(
            "Could not play background music:",
            error
        );

    }

}


function pauseBackgroundMusic() {

    backgroundMusicEnabled =
        false;


    musicPlayer.classList.remove(
        "playing"
    );


    fadeBackgroundMusic(
        0,
        BACKGROUND_FADE_OUT
    );


    // --------------------------------------------------------
    // PAUSE -> PLAY GIF
    // --------------------------------------------------------

    playerGif.src =
        "musics/play-pause.gif";


    setTimeout(
        () => {

            if (
                !backgroundMusicEnabled
            ) {

                playerGif.src =
                    "musics/play.jpg";

            }

        },
        PAUSE_ANIMATION_DURATION
    );


    setTimeout(
        () => {

            if (
                !backgroundMusicEnabled
            ) {

                backgroundMusic.pause();

            }

        },
        BACKGROUND_FADE_OUT
    );

}


// ============================================================
// TOGGLE MUSIC
// ============================================================

async function toggleBackgroundMusic() {

    if (
        backgroundMusic.paused
    ) {

        await playBackgroundMusic();

    } else {

        pauseBackgroundMusic();

    }

}


// ============================================================
// MUSIC PLAYER
// ============================================================

musicPlayer.addEventListener(
    "click",
    toggleBackgroundMusic
);


// ============================================================
// HORIZONTAL SCROLL
// ============================================================

musicList.addEventListener(
    "wheel",
    event => {

        if (
            Math.abs(
                event.deltaY
            ) >
            Math.abs(
                event.deltaX
            )
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


// ============================================================
// INITIAL STATE
// ============================================================

background.style.backgroundImage =
    `url("${DEFAULT_BACKGROUND}")`;


backgroundMusic.volume =
    0;


backgroundMusicEnabled =
    false;


background.classList.remove(
    "card-hover"
);


background.classList.remove(
    "changing"
);


musicPlayer.classList.remove(
    "playing"
);


playerGif.src =
    "musics/play.jpg";


// ============================================================
// START
// ============================================================

loadSongs();