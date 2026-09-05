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


// ============================================================
// SETTINGS
// ============================================================

const API_BASE =
    "https://musiccomp-api.ambrust-zoltan01.workers.dev";


const DEFAULT_COVER =
    "musics/covers/default.png";


const DEFAULT_BACKGROUND =
    "musics/default-bg.png";


const VOTED_ICON =
    "musics/voted.png";


const NORMAL_VOLUME =
    0.0;


const HOVER_VOLUME =
    75;


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

let currentCard =
    null;


let currentSong =
    null;


let backgroundMusicEnabled =
    false;


let backgroundMusicFadeFrame =
    null;


let backgroundChangeToken =
    0;


// ============================================================
// SOUNDCLOUD STATE
// ============================================================

const soundcloudAudio =
    new Audio();


soundcloudAudio.preload =
    "none";


soundcloudAudio.volume =
    HOVER_VOLUME / 100;


let soundcloudCurrentTrackId =
    null;


let soundcloudPlayToken =
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


function sleep(
    ms
) {

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
        Math.abs(
            difference
        ) <
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
            progress <
            1
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
            progress <
            1
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

function preloadImage(
    src
) {

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
// PRELOAD
// ============================================================

async function preloadAssets(
    songs
) {

    const images = [

        DEFAULT_COVER,

        DEFAULT_BACKGROUND,

        VOTED_ICON

    ];


    for (
        const song
        of songs
    ) {

        if (
            song.cover
        ) {

            images.push(
                song.cover
            );

        }

    }


    const uniqueImages =
        [
            ...new Set(
                images
            )
        ];


    await Promise.all(
        uniqueImages.map(
            preloadImage
        )
    );

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
// SEARCH SOUNDCLOUD
// ============================================================

async function searchSoundCloud(
    song
) {

    const query =
        `${song.artist} ${song.title}`;


    console.log(
        "Searching SoundCloud:",
        query
    );


    const response =
        await fetch(
            `${API_BASE}/api/soundcloud?q=${
                encodeURIComponent(
                    query
                )
            }`
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `SoundCloud search failed: ${
                response.status
            }`
        );

    }


    const data =
        await response.json();


    if (
        !data ||
        !Array.isArray(
            data.results
        )
    ) {

        return null;

    }


    if (
        data.results.length ===
        0
    ) {

        return null;

    }


    const result =
        data.results.find(
            item =>
                item.urn ||
                item.id
        );


    if (
        !result
    ) {

        return null;

    }


    console.log(
        "SoundCloud result:",
        result
    );


    return {

        id:
            result.id ??
            null,

        urn:
            result.urn ??
            null,

        permalink:
            result.permalink ??
            null

    };

}


// ============================================================
// GET SOUNDCLOUD STREAM URL
// ============================================================

async function getSoundCloudStreamUrl(
    trackId
) {

    if (
        !trackId
    ) {

        throw new Error(
            "Missing SoundCloud track ID."
        );

    }


    const response =
        await fetch(
            `${API_BASE}/api/soundcloud/stream?track=${
                encodeURIComponent(
                    trackId
                )
            }`
        );


    if (
        !response.ok
    ) {

        let details =
            "";


        try {

            const data =
                await response.json();


            details =
                data.details ||
                data.error ||
                "";

        } catch {

            // Ignore JSON errors.

        }


        throw new Error(
            `SoundCloud stream lookup failed: ${
                response.status
            }${
                details
                    ? `: ${details}`
                    : ""
            }`
        );

    }


    const data =
        await response.json();


    if (
        !data ||
        !data.streamUrl
    ) {

        throw new Error(
            "SoundCloud did not return a stream URL."
        );

    }


    return data.streamUrl;

}


// ============================================================
// LOAD SOUNDCLOUD SONG
// ============================================================

async function loadSoundCloudSong(
    song,
    token
) {

    if (
        !song.soundcloudId &&
        !song.soundcloudUrn
    ) {

        return false;

    }


    const trackId =
        song.soundcloudUrn ||
        song.soundcloudId;


    const streamUrl =
        await getSoundCloudStreamUrl(
            trackId
        );


    /*
        The mouse may have moved to another
        card while the request was running.
    */

    if (
        token !==
        soundcloudPlayToken
    ) {

        return false;

    }


    soundcloudCurrentTrackId =
        trackId;


    soundcloudAudio.pause();


    soundcloudAudio.src =
        streamUrl;


    soundcloudAudio.currentTime =
        0;


    soundcloudAudio.volume =
        HOVER_VOLUME / 100;


    try {

        await soundcloudAudio.play();

        console.log(
            "SoundCloud playback started:",
            trackId
        );


        return true;

    } catch (
        error
    ) {

        console.error(
            "Could not play SoundCloud:",
            error
        );


        return false;

    }

}


// ============================================================
// STOP SOUNDCLOUD
// ============================================================

function stopSoundCloud() {

    soundcloudPlayToken++;


    try {

        soundcloudAudio.pause();

    } catch {

        // Ignore.

    }


    soundcloudAudio.removeAttribute(
        "src"
    );


    soundcloudAudio.load();


    soundcloudCurrentTrackId =
        null;

}


// ============================================================
// CARD ENTER
// ============================================================

async function handleCardEnter(
    card,
    song
) {

    currentCard =
        card;


    currentSong =
        song;


    const token =
        ++soundcloudPlayToken;


    background.classList.add(
        "card-hover"
    );


    await changeBackground(
        song.cover ||
        DEFAULT_BACKGROUND
    );


    fadeBackgroundMusic(
        0,
        BACKGROUND_FADE_OUT
    );


    /*
        The mouse may have moved away
        while the background was loading.
    */

    if (
        currentCard !==
        card ||
        token !==
        soundcloudPlayToken
    ) {

        return;

    }


    try {

        /*
            Search SoundCloud only once.
        */

        if (
            !song.soundcloudId &&
            !song.soundcloudUrn
        ) {

            const result =
                await searchSoundCloud(
                    song
                );


            if (
                result
            ) {

                song.soundcloudId =
                    result.id;

                song.soundcloudUrn =
                    result.urn;

            }

        }


        /*
            Mouse may have moved to another
            card while searching.
        */

        if (
            currentCard !==
            card ||
            token !==
            soundcloudPlayToken
        ) {

            return;

        }


        const trackId =
            song.soundcloudUrn ||
            song.soundcloudId;


        if (
            trackId
        ) {

            await loadSoundCloudSong(
                song,
                token
            );

        }

    } catch (
        error
    ) {

        console.error(
            "Could not load SoundCloud:",
            error
        );

    }

}


// ============================================================
// CARD LEAVE
// ============================================================

function handleCardLeave(
    card
) {

    if (
        currentCard ===
        card
    ) {

        stopSoundCloud();


        currentCard =
            null;


        currentSong =
            null;

    }


    background.classList.remove(
        "card-hover"
    );


    fadeBackgroundMusic(
        backgroundMusicEnabled
            ? BACKGROUND_VOLUME
            : 0,
        BACKGROUND_FADE_IN
    );


    resetBackground();

}


// ============================================================
// VOTE KEY
// ============================================================

function getVoteKey(
    song,
    index
) {

    return `musiccomp-vote-${
        song.spotifyId ||
        song.spotify ||
        index
    }`;

}


// ============================================================
// UPDATE VOTE
// ============================================================

function updateVoteButton(
    button,
    voted
) {

    if (
        voted
    ) {

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


// ============================================================
// SETUP VOTE
// ============================================================

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


    if (
        savedVote
    ) {

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
                String(
                    newState
                )
            );


            updateVoteButton(
                button,
                newState
            );


            const card =
                button.closest(
                    ".music-card"
                );


            if (
                card
            ) {

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

    if (
        description
    ) {

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


        if (
            album
        ) {

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


        if (
            year
        ) {

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


        if (
            genre
        ) {

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
    // SPOTIFY BUTTON
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
    // VOTE BUTTON
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


    info.appendChild(
        actions
    );


    // ========================================================
    // APPEND
    // ========================================================

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
    // VOTE SETUP
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

        console.log(
            "Loading Spotify playlist..."
        );


        const response =
            await fetch(
                `${API_BASE}/api/songs`
            );


        if (
            !response.ok
        ) {

            let details =
                "";


            try {

                const errorData =
                    await response.json();


                details =
                    errorData.error ||
                    errorData.details ||
                    "";

            } catch {

                // Ignore parse error.

            }


            throw new Error(
                `HTTP ${
                    response.status
                }${
                    details
                        ? `: ${details}`
                        : ""
                }`
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !Array.isArray(
                data.songs
            )
        ) {

            throw new Error(
                "Invalid Spotify response."
            );

        }


        const songs =
            data.songs;


        console.log(
            `Loaded ${songs.length} songs from Spotify.`
        );


        // ----------------------------------------------------
        // PRELOAD
        // ----------------------------------------------------

        await preloadAssets(
            songs
        );


        // ----------------------------------------------------
        // CREATE CARDS
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


    } catch (
        error
    ) {

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


        if (
            loaderText
        ) {

            loaderText.textContent =
                "FAILED TO LOAD SONGS";

        }

    }

}


// ============================================================
// BACKGROUND MUSIC
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


    } catch (
        error
    ) {

        console.warn(
            "Could not play background music:",
            error
        );

    }

}


// ============================================================
// PAUSE BACKGROUND MUSIC
// ============================================================

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
// TOGGLE BACKGROUND MUSIC
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
        passive:
            false
    }
);


// ============================================================
// INITIAL STATE
// ============================================================

background.style.backgroundImage =
    `url("${DEFAULT_BACKGROUND}")`;


backgroundMusic.volume =
    NORMAL_VOLUME;


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


soundcloudAudio.volume =
    HOVER_VOLUME / 100;


// ============================================================
// START
// ============================================================

loadSongs();