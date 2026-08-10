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

const playerCanvas =
    document.getElementById("player-canvas");

const playerContext =
    playerCanvas.getContext("2d");


/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_COVER =
    "musics/covers/default.png";

const DEFAULT_BACKGROUND =
    "musics/default-bg.png";

const PLAYER_GIF =
    "musics/player.gif";


/*
    Candidate music.

    Alapból hallható legyen, de ne legyen olyan hangos,
    hogy az összes jelölt egyszerre szétrobbanjon.
*/

const NORMAL_VOLUME =
    0.08;

const HOVER_VOLUME =
    0.75;


/*
    Background music.
*/

const BACKGROUND_VOLUME =
    0.18;

const BACKGROUND_HOVER_VOLUME =
    0.025;


const AUDIO_FADE_DURATION =
    350;

const BACKGROUND_FADE_DURATION =
    450;


/*
    GIF animation.
*/

const PLAYER_FRAME_DURATION =
    45;


/* =========================================================
   STATE
========================================================= */

let songs = [];

let currentHoveredCard =
    null;

let audioUnlocked =
    false;

let backgroundMusicEnabled =
    false;

const audios =
    new Set();


/*
    Player GIF frames.
*/

let playerFrames = [];

let playerFrameDurations = [];

let playerFrameWidth = 0;

let playerFrameHeight = 0;

let playerFrameIndex = 0;

let playerAnimationId = null;

let playerAnimationDirection =
    1;

let playerAnimationPlaying =
    false;


/* =========================================================
   LOAD GIF
========================================================= */

/*
    A gifuct-js könyvtár segítségével
    kiolvassuk a GIF összes frame-jét.

    Ez azért kell, mert a GIF <img>-ként nem
    játszható visszafelé.
*/

async function loadPlayerGif() {

    try {

        const module =
            await import(
                "https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm"
            );


        const response =
            await fetch(
                PLAYER_GIF
            );


        if (!response.ok) {

            throw new Error(
                `GIF HTTP ${response.status}`
            );

        }


        const buffer =
            await response.arrayBuffer();


        const gif =
            module.parseGIF(
                buffer
            );


        const frames =
            module.decompressFrames(
                gif,
                true
            );


        if (
            !frames ||
            frames.length === 0
        ) {

            throw new Error(
                "A GIF nem tartalmaz frame-eket."
            );

        }


        playerFrameWidth =
            gif.lsd.width;


        playerFrameHeight =
            gif.lsd.height;


        playerCanvas.width =
            playerFrameWidth;


        playerCanvas.height =
            playerFrameHeight;


        /*
            A GIF frame-ekből valódi canvas képeket készítünk.
        */

        const tempCanvas =
            document.createElement(
                "canvas"
            );


        tempCanvas.width =
            playerFrameWidth;


        tempCanvas.height =
            playerFrameHeight;


        const tempContext =
            tempCanvas.getContext(
                "2d"
            );


        playerFrames =
            [];


        playerFrameDurations =
            [];


        for (
            const frame of frames
        ) {

            /*
                A frame patch-et rajzoljuk a megfelelő helyre.
            */

            const imageData =
                tempContext.createImageData(
                    frame.dims.width,
                    frame.dims.height
                );


            imageData.data.set(
                frame.patch
            );


            tempContext.putImageData(
                imageData,
                frame.dims.left,
                frame.dims.top
            );


            /*
                Minden frame-ről teljes screenshotot készítünk.
            */

            const frameCanvas =
                document.createElement(
                    "canvas"
                );


            frameCanvas.width =
                playerFrameWidth;


            frameCanvas.height =
                playerFrameHeight;


            const frameContext =
                frameCanvas.getContext(
                    "2d"
                );


            frameContext.drawImage(
                tempCanvas,
                0,
                0
            );


            playerFrames.push(
                frameCanvas
            );


            /*
                GIF delay általában századmásodpercben
                érkezik.
            */

            const duration =
                Math.max(
                    20,
                    (frame.delay || 5) * 10
                );


            playerFrameDurations.push(
                duration
            );

        }


        /*
            Első frame megjelenítése.
        */

        playerFrameIndex =
            0;


        drawPlayerFrame();


        console.log(
            `Player GIF betöltve: ${playerFrames.length} frame`
        );

    } catch (error) {

        console.error(
            "Nem sikerült beolvasni a player.gif fájlt:",
            error
        );

    }

}


/* =========================================================
   DRAW PLAYER FRAME
========================================================= */

function drawPlayerFrame() {

    if (
        !playerFrames.length
    ) {

        return;

    }


    const frame =
        playerFrames[
            playerFrameIndex
        ];


    playerContext.clearRect(
        0,
        0,
        playerFrameWidth,
        playerFrameHeight
    );


    playerContext.drawImage(
        frame,
        0,
        0
    );

}


/* =========================================================
   ANIMATE PLAYER
========================================================= */

function animatePlayer() {

    if (
        !playerAnimationPlaying
    ) {

        return;

    }


    const duration =
        playerFrameDurations[
            playerFrameIndex
        ] ||
        PLAYER_FRAME_DURATION;


    playerAnimationId =
        setTimeout(
            () => {

                /*
                    Előre vagy visszafelé lépünk.
                */

                playerFrameIndex +=
                    playerAnimationDirection;


                /*
                    Elértük a végét.
                */

                if (
                    playerFrameIndex >=
                    playerFrames.length
                ) {

                    playerFrameIndex =
                        playerFrames.length - 1;


                    playerAnimationPlaying =
                        false;


                    drawPlayerFrame();

                    return;
                }


                /*
                    Elértük az elejét.
                */

                if (
                    playerFrameIndex < 0
                ) {

                    playerFrameIndex =
                        0;


                    playerAnimationPlaying =
                        false;


                    drawPlayerFrame();

                    return;
                }


                drawPlayerFrame();

                animatePlayer();

            },
            duration
        );

}


/* =========================================================
   PLAY PLAYER ANIMATION
========================================================= */

function animatePlayerForward() {

    if (
        !playerFrames.length
    ) {

        return;

    }


    /*
        Ha már a pause állapotnál vagyunk,
        akkor visszafelé kell menni.
    */

    playerAnimationDirection =
        -1;


    /*
        Ha az elején vagyunk, akkor nincs mit
        visszafelé játszani.

        Ilyenkor előre megyünk.
    */

    if (
        playerFrameIndex <= 0
    ) {

        playerFrameIndex =
            0;

        playerAnimationDirection =
            1;

    }


    stopPlayerAnimation();


    playerAnimationPlaying =
        true;


    animatePlayer();

}


/* =========================================================
   PAUSE PLAYER ANIMATION
========================================================= */

function animatePlayerBackward() {

    if (
        !playerFrames.length
    ) {

        return;

    }


    /*
        Pause esetén a play állapotból
        a pause állapotba megyünk.

        Tehát előre.
    */

    playerAnimationDirection =
        1;


    /*
        Ha már a végén vagyunk,
        nincs mit tovább játszani.
    */

    if (
        playerFrameIndex >=
        playerFrames.length - 1
    ) {

        playerFrameIndex =
            playerFrames.length - 1;

        return;

    }


    stopPlayerAnimation();


    playerAnimationPlaying =
        true;


    animatePlayer();

}


/* =========================================================
   STOP PLAYER ANIMATION
========================================================= */

function stopPlayerAnimation() {

    playerAnimationPlaying =
        false;


    if (
        playerAnimationId !== null
    ) {

        clearTimeout(
            playerAnimationId
        );

        playerAnimationId =
            null;

    }

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


        if (
            !Array.isArray(songs)
        ) {

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
        document.createElement(
            "article"
        );


    card.className =
        "music-card";


    card.dataset.index =
        index;


    /* =====================================================
       COVER
    ====================================================== */

    const cover =
        document.createElement(
            "img"
        );


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
        document.createElement(
            "div"
        );


    votedPill.className =
        "voted-pill";


    const votedIcon =
        document.createElement(
            "img"
        );


    votedIcon.src =
        "musics/voted.png";


    votedIcon.alt =
        "";


    const votedText =
        document.createElement(
            "span"
        );


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


    if (
        song.preview
    ) {

        audio =
            document.createElement(
                "audio"
            );


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
        document.createElement(
            "div"
        );


    info.className =
        "info";


    /* =====================================================
       TITLE
    ====================================================== */

    const title =
        document.createElement(
            "h2"
        );


    title.textContent =
        song.title ||
        "Unknown title";


    /* =====================================================
       ARTIST
    ====================================================== */

    const artist =
        document.createElement(
            "p"
        );


    artist.textContent =
        song.artist ||
        "Unknown artist";


    /* =====================================================
       DESCRIPTION
    ====================================================== */

    let description =
        null;


    if (
        song.description
    ) {

        description =
            document.createElement(
                "div"
            );


        description.className =
            "description";


        description.textContent =
            song.description;

    }


    /* =====================================================
       META
    ====================================================== */

    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "info-meta";


    if (
        song.album
    ) {

        const album =
            document.createElement(
                "span"
            );


        album.textContent =
            song.album;


        meta.appendChild(
            album
        );

    }


    if (
        song.year
    ) {

        const year =
            document.createElement(
                "span"
            );


        year.textContent =
            song.year;


        meta.appendChild(
            year
        );

    }


    if (
        song.genre
    ) {

        const genre =
            document.createElement(
                "span"
            );


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
        document.createElement(
            "div"
        );


    actions.className =
        "card-actions";


    /* =====================================================
       SPOTIFY
    ====================================================== */

    const spotify =
        document.createElement(
            "a"
        );


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
        document.createElement(
            "button"
        );


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


    if (
        alreadyVoted
    ) {

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


            if (
                hasVoted
            ) {

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

            } else {

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


    if (
        description
    ) {

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
       HOVER
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
            BACKGROUND_HOVER_VOLUME,
            BACKGROUND_FADE_DURATION
        );

    }


    /* =====================================================
       CARD AUDIO
    ====================================================== */

    if (
        audio
    ) {

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


    /*
        Fontos:

        Nem requestAnimationFrame-ben csináljuk,
        hanem timeouttal.

        Így ha azonnal egy másik kártyára húzol,
        nem kezd el a háttér össze-vissza fade-elni.
    */

    setTimeout(
        () => {

            if (
                !currentHoveredCard
            ) {

                if (
                    backgroundMusicEnabled
                ) {

                    fadeAudio(
                        backgroundMusic,
                        BACKGROUND_VOLUME,
                        BACKGROUND_FADE_DURATION
                    );

                }


                resetBackground();

            }

        },
        20
    );

}


/* =========================================================
   CHANGE BACKGROUND
========================================================= */

function changeBackground(
    image
) {

    if (
        !image
    ) {

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
        Hover háttér:

        EZT állíthatod, ha több / kevesebb blur kell.
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

    if (
        !audio
    ) {

        return;

    }


    /*
        Ha már megy, NEM indítjuk újra.
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

    if (
        !audio
    ) {

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
   MUSIC PLAYER
========================================================= */

musicPlayer.addEventListener(
    "click",
    async event => {

        event.stopPropagation();


        if (
            !audioUnlocked
        ) {

            await unlockAudio();

        }


        if (
            backgroundMusic.paused
        ) {

            startBackgroundMusic();

        } else {

            pauseBackgroundMusic();

        }

    }
);


/* =========================================================
   START BACKGROUND MUSIC
========================================================= */

async function startBackgroundMusic() {

    try {

        await backgroundMusic.play();


        backgroundMusicEnabled =
            true;


        musicPlayer.classList.add(
            "playing"
        );


        /*
            A háttérzene normál hangerőre kerül.
        */

        fadeAudio(
            backgroundMusic,
            currentHoveredCard
                ? BACKGROUND_HOVER_VOLUME
                : BACKGROUND_VOLUME,
            BACKGROUND_FADE_DURATION
        );


        /*
            GIF:

            play → pause állapot
            visszafelé kell mennie.
        */

        animatePlayerForward();

    } catch (error) {

        console.error(
            "Nem sikerült elindítani a háttérzenét:",
            error
        );

    }

}


/* =========================================================
   PAUSE BACKGROUND MUSIC
========================================================= */

function pauseBackgroundMusic() {

    /*
        Fade után pause.

        Nem vágjuk el azonnal.
    */

    fadeAudio(
        backgroundMusic,
        0,
        BACKGROUND_FADE_DURATION
    );


    setTimeout(
        () => {

            /*
                Csak akkor pause-oljuk,
                ha közben nem indítottuk újra.
            */

            if (
                backgroundMusic.paused
            ) {

                return;

            }


            backgroundMusic.pause();


            backgroundMusic.volume =
                BACKGROUND_VOLUME;

        },
        BACKGROUND_FADE_DURATION
    );


    backgroundMusicEnabled =
        false;


    musicPlayer.classList.remove(
        "playing"
    );


    /*
        GIF:

        pause → play állapot.
        Tehát előrefelé.
    */

    animatePlayerBackward();

}


/* =========================================================
   UNLOCK AUDIO
========================================================= */

async function unlockAudio() {

    if (
        audioUnlocked
    ) {

        return;

    }


    audioUnlocked =
        true;


    /*
        Candidate zenék elindítása.

        Innentől mindegyik folyamatosan megy,
        csak hangerővel szabályozzuk őket.
    */

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
   INITIALIZE PLAYER
========================================================= */

loadPlayerGif();


/* =========================================================
   LOAD SONGS
========================================================= */

loadSongs();