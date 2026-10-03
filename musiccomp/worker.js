const ALLOWED_ORIGINS = [

    "https://f0x3y.github.io",

    "http://127.0.0.1:3000",
    "http://localhost:3000",

    "http://127.0.0.1:3001",
    "http://localhost:3001",

    "http://127.0.0.1:3002",
    "http://localhost:3002"

];


// ============================================================
// CORS
// ============================================================

function corsHeaders(
    origin
) {

    const allowedOrigin =
        ALLOWED_ORIGINS.includes(
            origin
        )
            ? origin
            : null;


    return {

        "Access-Control-Allow-Origin":
            allowedOrigin ?? "null",

        "Access-Control-Allow-Methods":
            "GET, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type, Range",

        "Access-Control-Expose-Headers":
            "Content-Length, Content-Range, Accept-Ranges",

        "Vary":
            "Origin"

    };

}


// ============================================================
// JSON
// ============================================================

function json(
    data,
    status = 200,
    origin = null
) {

    return new Response(

        JSON.stringify(
            data
        ),

        {

            status,

            headers: {

                "Content-Type":
                    "application/json; charset=UTF-8",

                ...corsHeaders(
                    origin
                )

            }

        }

    );

}


// ============================================================
// RANDOM STATE
// ============================================================

function randomState() {

    const bytes =
        crypto.getRandomValues(
            new Uint8Array(32)
        );


    return btoa(
        String.fromCharCode(
            ...bytes
        )
    )

        .replace(
            /\+/g,
            "-"
        )

        .replace(
            /\//g,
            "_"
        )

        .replace(
            /=/g,
            ""
        );

}


// ============================================================
// COOKIE
// ============================================================

function getCookie(
    request,
    name
) {

    const header =
        request.headers.get(
            "Cookie"
        );


    if (!header) {

        return null;

    }


    for (
        const part
        of header.split(";")
    ) {

        const separator =
            part.indexOf("=");


        if (
            separator ===
            -1
        ) {

            continue;

        }


        const key =
            part
                .slice(
                    0,
                    separator
                )
                .trim();


        const value =
            part
                .slice(
                    separator + 1
                )
                .trim();


        if (
            key ===
            name
        ) {

            try {

                return decodeURIComponent(
                    value
                );

            } catch {

                return value;

            }

        }

    }


    return null;

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// SPOTIFY LOGIN
// ============================================================

async function spotifyLogin(
    request,
    env
) {

    if (
        !env.SPOTIFY_CLIENT_ID
    ) {

        return new Response(
            "Missing SPOTIFY_CLIENT_ID",
            {
                status:
                    500
            }
        );

    }


    const requestUrl =
        new URL(
            request.url
        );


    const redirectUri =
        `${requestUrl.origin}/spotify/callback`;


    const state =
        randomState();


    const authorizeUrl =
        new URL(
            "https://accounts.spotify.com/authorize"
        );


    authorizeUrl.searchParams.set(
        "client_id",
        env.SPOTIFY_CLIENT_ID
    );


    authorizeUrl.searchParams.set(
        "response_type",
        "code"
    );


    authorizeUrl.searchParams.set(
        "redirect_uri",
        redirectUri
    );


    authorizeUrl.searchParams.set(
        "scope",
        "playlist-read-private"
    );


    authorizeUrl.searchParams.set(
        "state",
        state
    );


    return new Response(
        null,
        {

            status:
                302,

            headers: {

                "Location":
                    authorizeUrl.toString(),

                "Set-Cookie":
                    `spotify_oauth_state=${
                        encodeURIComponent(
                            state
                        )
                    }; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`

            }

        }
    );

}


// ============================================================
// SPOTIFY CALLBACK
// ============================================================

async function spotifyCallback(
    request,
    env
) {

    const url =
        new URL(
            request.url
        );


    const error =
        url.searchParams.get(
            "error"
        );


    if (
        error
    ) {

        return new Response(

            `
<!DOCTYPE html>
<html>
<body>

<h1>Spotify authorization failed</h1>

<p>
${escapeHtml(error)}
</p>

</body>
</html>
            `,

            {

                status:
                    400,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8"

                }

            }

        );

    }


    const code =
        url.searchParams.get(
            "code"
        );


    const returnedState =
        url.searchParams.get(
            "state"
        );


    if (
        !code ||
        !returnedState
    ) {

        return new Response(
            "Missing code or state.",
            {
                status:
                    400
            }
        );

    }


    const storedState =
        getCookie(
            request,
            "spotify_oauth_state"
        );


    if (
        !storedState ||
        storedState !==
            returnedState
    ) {

        return new Response(
            "Invalid OAuth state.",
            {
                status:
                    400
            }
        );

    }


    const requestUrl =
        new URL(
            request.url
        );


    const redirectUri =
        `${requestUrl.origin}/spotify/callback`;


    if (
        !env.SPOTIFY_CLIENT_ID ||
        !env.SPOTIFY_CLIENT_SECRET
    ) {

        return new Response(
            "Spotify client credentials are missing.",
            {
                status:
                    500
            }
        );

    }


    const credentials =
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`;


    const basicAuth =
        btoa(
            credentials
        );


    const tokenResponse =
        await fetch(

            "https://accounts.spotify.com/api/token",

            {

                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Basic ${basicAuth}`,

                    "Content-Type":
                        "application/x-www-form-urlencoded"

                },

                body:
                    new URLSearchParams({

                        grant_type:
                            "authorization_code",

                        code,

                        redirect_uri:
                            redirectUri

                    })

            }

        );


    const tokenData =
        await tokenResponse.json();


    if (
        !tokenResponse.ok
    ) {

        return new Response(

            `
<!DOCTYPE html>
<html>
<body>

<h1>Spotify token exchange failed</h1>

<pre>
${escapeHtml(
    JSON.stringify(
        tokenData,
        null,
        2
    )
)}
</pre>

</body>
</html>
            `,

            {

                status:
                    500,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8"

                }

            }

        );

    }


    if (
        !tokenData.refresh_token
    ) {

        return new Response(

            `
<!DOCTYPE html>
<html>
<body>

<h1>No refresh token received</h1>

<pre>
${escapeHtml(
    JSON.stringify(
        tokenData,
        null,
        2
    )
)}
</pre>

</body>
</html>
            `,

            {

                status:
                    500,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8"

                }

            }

        );

    }


    return new Response(

        `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Spotify authorization complete
</title>

<style>

body {

    font-family:
        system-ui,
        sans-serif;

    background:
        #111;

    color:
        white;

    padding:
        40px;

    max-width:
        900px;

    margin:
        auto;

}

code {

    display:
        block;

    padding:
        20px;

    margin:
        20px 0;

    border-radius:
        12px;

    background:
        #222;

    word-break:
        break-all;

}

.warning {

    color:
        #ff8585;

}

</style>

</head>

<body>

<h1>
Spotify authorization complete
</h1>

<p>
Create a Cloudflare Secret called:
</p>

<code>
SPOTIFY_REFRESH_TOKEN
</code>

<p>
and put this value into it:
</p>

<code>
${escapeHtml(
    tokenData.refresh_token
)}
</code>

<p class="warning">
Do not put the token into GitHub or frontend JavaScript.
</p>

</body>

</html>
        `,

        {

            status:
                200,

            headers: {

                "Content-Type":
                    "text/html; charset=UTF-8",

                "Set-Cookie":
                    "spotify_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"

            }

        }

    );

}


// ============================================================
// SPOTIFY ACCESS TOKEN
// ============================================================

async function getSpotifyAccessToken(
    env
) {

    if (
        !env.SPOTIFY_CLIENT_ID ||
        !env.SPOTIFY_CLIENT_SECRET ||
        !env.SPOTIFY_REFRESH_TOKEN
    ) {

        throw new Error(
            "Spotify secrets are missing."
        );

    }


    const credentials =
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`;


    const basicAuth =
        btoa(
            credentials
        );


    const response =
        await fetch(

            "https://accounts.spotify.com/api/token",

            {

                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Basic ${basicAuth}`,

                    "Content-Type":
                        "application/x-www-form-urlencoded"

                },

                body:
                    new URLSearchParams({

                        grant_type:
                            "refresh_token",

                        refresh_token:
                            env.SPOTIFY_REFRESH_TOKEN

                    })

            }

        );


    const data =
        await response.json();


    if (
        !response.ok
    ) {

        throw new Error(

            `Spotify token refresh failed: ${
                JSON.stringify(
                    data
                )
            }`

        );

    }


    return data.access_token;

}


// ============================================================
// GET SPOTIFY PLAYLIST
// ============================================================

async function getSpotifySongs(
    env
) {

    if (
        !env.SPOTIFY_PLAYLIST_ID
    ) {

        throw new Error(
            "SPOTIFY_PLAYLIST_ID is missing."
        );

    }


    const accessToken =
        await getSpotifyAccessToken(
            env
        );


    let url =
        new URL(

            `https://api.spotify.com/v1/playlists/${
                env.SPOTIFY_PLAYLIST_ID
            }/items`

        );


    url.searchParams.set(
        "limit",
        "50"
    );


    const songs = [];


    while (
        url
    ) {

        const response =
            await fetch(

                url,

                {

                    headers: {

                        "Authorization":
                            `Bearer ${accessToken}`

                    }

                }

            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(

                `Spotify playlist request failed: ${
                    JSON.stringify(
                        data
                    )
                }`

            );

        }


        for (
            const item
            of data.items ?? []
        ) {

            const track =
                item.item;


            if (
                !track ||
                track.type !==
                    "track"
            ) {

                continue;

            }


            const artist =
                track.artists
                    ?.map(
                        artist =>
                            artist.name
                    )
                    .join(
                        ", "
                    )
                ??
                "Unknown artist";


            const cover =
                track.album
                    ?.images?.[0]
                    ?.url
                ??
                null;


            songs.push({

                spotify:
                    track.external_urls
                        ?.spotify
                    ??
                    `https://open.spotify.com/track/${track.id}`,

                spotifyId:
                    track.id,

                title:
                    track.name,

                artist,

                album:
                    track.album
                        ?.name
                    ??
                    "",

                year:
                    track.album
                        ?.release_date
                        ?.slice(
                            0,
                            4
                        )
                    ??
                    "",

                cover,

                description:
                    "",

                genre:
                    "",

                preview:
                    null,

                durationMs:
                    track.duration_ms
                    ??
                    null

            });

        }


        url =
            data.next
                ? new URL(
                    data.next
                )
                : null;

    }


    return songs;

}


// ============================================================
// SOUNDCLOUD TOKEN CACHE
// ============================================================

let soundcloudAccessToken =
    null;


let soundcloudAccessTokenExpiresAt =
    0;


let soundcloudTokenPromise =
    null;


// ============================================================
// GET SOUNDCLOUD ACCESS TOKEN
// ============================================================

async function getSoundCloudAccessToken(
    env
) {

    if (
        !env.SOUNDCLOUD_CLIENT_ID ||
        !env.SOUNDCLOUD_CLIENT_SECRET
    ) {

        throw new Error(
            "SoundCloud secrets are missing."
        );

    }


    const now =
        Date.now();


    if (
        soundcloudAccessToken &&
        soundcloudAccessTokenExpiresAt >
            now + 60_000
    ) {

        return soundcloudAccessToken;

    }


    if (
        soundcloudTokenPromise
    ) {

        return soundcloudTokenPromise;

    }


    soundcloudTokenPromise =
        (async () => {

            const credentials =
                `${env.SOUNDCLOUD_CLIENT_ID}:${env.SOUNDCLOUD_CLIENT_SECRET}`;


            const basicAuth =
                btoa(
                    credentials
                );


            const response =
                await fetch(

                    "https://secure.soundcloud.com/oauth/token",

                    {

                        method:
                            "POST",

                        headers: {

                            "Authorization":
                                `Basic ${basicAuth}`,

                            "Content-Type":
                                "application/x-www-form-urlencoded",

                            "Accept":
                                "application/json"

                        },

                        body:
                            new URLSearchParams({

                                grant_type:
                                    "client_credentials"

                            })

                    }

                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.access_token
            ) {

                throw new Error(

                    `SoundCloud token request failed: ${
                        JSON.stringify(
                            data
                        )
                    }`

                );

            }


            soundcloudAccessToken =
                data.access_token;


            soundcloudAccessTokenExpiresAt =
                Date.now() +
                (
                    Number(
                        data.expires_in ||
                        3600
                    ) *
                    1000
                );


            return soundcloudAccessToken;

        })();


    try {

        return await soundcloudTokenPromise;

    } finally {

        soundcloudTokenPromise =
            null;

    }

}


// ============================================================
// TEXT NORMALIZATION
// ============================================================

function normalizeText(
    value
) {

    return String(
        value || ""
    )

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .replace(
            /&/g,
            " and "
        )

        .replace(
            /\b(feat\.?|ft\.?|featuring)\b/g,
            " "
        )

        .replace(
            /\b(feat|ft)\b/g,
            " "
        )

        .replace(
            /\b(official|audio|video|music video|lyrics?|visualizer|official audio|official video)\b/g,
            " "
        )

        .replace(
            /[\[\]\(\)\{\}_\-–—.,!?'"`:;\\/|+*=<>]/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


// ============================================================
// TOKEN SET
// ============================================================

function tokenSet(
    value
) {

    return new Set(

        normalizeText(
            value
        )

            .split(
                " "
            )

            .filter(
                Boolean
            )

    );

}


// ============================================================
// TOKEN SIMILARITY
// ============================================================

function tokenSimilarity(
    first,
    second
) {

    const firstTokens =
        tokenSet(
            first
        );


    const secondTokens =
        tokenSet(
            second
        );


    if (
        !firstTokens.size ||
        !secondTokens.size
    ) {

        return 0;

    }


    let intersection =
        0;


    for (
        const token
        of firstTokens
    ) {

        if (
            secondTokens.has(
                token
            )
        ) {

            intersection++;

        }

    }


    return intersection /
        Math.max(
            firstTokens.size,
            secondTokens.size
        );

}


// ============================================================
// ARTIST TOKEN MATCH
// ============================================================

function artistMatchScore(
    originalArtist,
    candidateArtist
) {

    const originalTokens =
        tokenSet(
            originalArtist
        );


    const candidateTokens =
        tokenSet(
            candidateArtist
        );


    if (
        !originalTokens.size ||
        !candidateTokens.size
    ) {

        return 0;

    }


    let matches =
        0;


    for (
        const token
        of originalTokens
    ) {

        if (
            candidateTokens.has(
                token
            )
        ) {

            matches++;

        }

    }


    const ratio =
        matches /
        originalTokens.size;


    if (
        ratio >=
        1
    ) {

        return 30;

    }


    if (
        ratio >=
        0.8
    ) {

        return 25;

    }


    if (
        ratio >=
        0.5
    ) {

        return 18;

    }


    if (
        ratio > 0
    ) {

        return 10;

    }


    return 0;

}


// ============================================================
// DIFFERENT VERSION
// ============================================================

function hasDifferentVersion(
    originalTitle,
    candidateTitle
) {

    const original =
        normalizeText(
            originalTitle
        );


    const candidate =
        normalizeText(
            candidateTitle
        );


    const versionWords = [

        "remix",
        "edit",
        "cover",
        "live",
        "acoustic",
        "sped up",
        "slowed",
        "nightcore",
        "instrumental",
        "karaoke",
        "bootleg",
        "rework",
        "vip",
        "extended",
        "radio edit",
        "remastered",
        "reimagined",
        "version"

    ];


    const originalHasVersion =
        versionWords.some(
            word =>
                original.includes(
                    word
                )
        );


    const candidateHasVersion =
        versionWords.some(
            word =>
                candidate.includes(
                    word
                )
        );


    return (
        !originalHasVersion &&
        candidateHasVersion
    );

}


// ============================================================
// SCORE SOUNDCLOUD RESULT
// ============================================================

function scoreSoundCloudResult(
    song,
    candidate
) {

    const originalTitle =
        normalizeText(
            song.title
        );


    const candidateTitle =
        normalizeText(
            candidate.title
        );


    let score =
        0;


    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    if (
        originalTitle &&
        candidateTitle ===
            originalTitle
    ) {

        score +=
            55;

    } else {

        const similarity =
            tokenSimilarity(
                originalTitle,
                candidateTitle
            );


        if (
            similarity >=
            0.95
        ) {

            score +=
                50;

        } else if (
            similarity >=
            0.80
        ) {

            score +=
                42;

        } else if (
            similarity >=
            0.65
        ) {

            score +=
                32;

        } else if (
            candidateTitle.includes(
                originalTitle
            ) &&
            originalTitle.length >=
                3
        ) {

            score +=
                27;

        } else if (
            originalTitle.includes(
                candidateTitle
            ) &&
            candidateTitle.length >=
                3
        ) {

            score +=
                22;

        }

    }


    // --------------------------------------------------------
    // ARTIST
    // --------------------------------------------------------

    const candidateArtist =
        candidate.user?.username
        ??
        candidate.publisher_metadata
            ?.artist
        ??
        "";


    score +=
        artistMatchScore(
            song.artist,
            candidateArtist
        );


    // --------------------------------------------------------
    // DURATION
    // --------------------------------------------------------

    if (
        song.durationMs &&
        candidate.duration
    ) {

        const difference =
            Math.abs(

                Number(
                    song.durationMs
                ) -

                Number(
                    candidate.duration
                )

            );


        if (
            difference <=
            1500
        ) {

            score +=
                10;

        } else if (
            difference <=
            3000
        ) {

            score +=
                8;

        } else if (
            difference <=
            5000
        ) {

            score +=
                6;

        } else if (
            difference <=
            10000
        ) {

            score +=
                3;

        }

    }


    // --------------------------------------------------------
    // PLAYABLE BONUS
    // --------------------------------------------------------

    if (
        candidate.access ===
        "playable"
    ) {

        score +=
            5;

    }


    // --------------------------------------------------------
    // VERSION PENALTY
    // --------------------------------------------------------

    if (
        hasDifferentVersion(
            song.title,
            candidate.title
        )
    ) {

        score -=
            25;

    }


    return Math.max(
        0,
        Math.min(
            100,
            score
        )
    );

}


// ============================================================
// SOUNDCLOUD SEARCH CANDIDATE MAPPING
// ============================================================

function mapSoundCloudCandidate(
    track,
    song
) {

    return {

        id:
            track.id
            ??
            null,

        urn:
            track.urn
            ??
            null,

        title:
            track.title
            ??
            "",

        artist:
            track.user?.username
            ??
            track.publisher_metadata
                ?.artist
            ??
            "",

        duration:
            track.duration
            ??
            null,

        score:
            scoreSoundCloudResult(
                song,
                track
            ),

        access:
            track.access
            ??
            null,

        permalink:
            track.permalink_url
            ??
            null,

        artworkUrl:
            track.artwork_url
            ??
            track.user
                ?.avatar_url
            ??
            null

    };

}


// ============================================================
// SOUNDCLOUD SEARCH QUERY BUILDERS
// ============================================================

function buildSoundCloudSearchQueries(
    artist,
    title
) {

    const artistText =
        String(
            artist || ""
        )
            .trim();


    const titleText =
        String(
            title || ""
        )
            .trim();


    const cleanArtist =
        artistText
            .replace(
                /\s*,\s*/g,
                " "
            )
            .replace(
                /\b(?:feat|ft|featuring)\b.*$/gi,
                ""
            )
            .replace(
                /[\[\]()_\-–—.,!?"'`:/|+*=<>]/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    const cleanTitle =
        titleText
            .replace(
                /\b(?:feat|ft|featuring)\b.*$/gi,
                ""
            )
            .replace(
                /[\[\]()_\-–—.,!?"'`:/|+*=<>]/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    const queries =
        new Set();


    const addQuery =
        value => {

            const trimmed =
                String(
                    value || ""
                )
                    .trim();

            if (
                trimmed
            ) {

                queries.add(
                    trimmed
                );

            }

        };


    addQuery(
        [
            cleanArtist,
            cleanTitle
        ]
            .filter(
                Boolean
            )
            .join(
                " "
            )
    );


    addQuery(
        [
            cleanTitle,
            cleanArtist
        ]
            .filter(
                Boolean
            )
            .join(
                " "
            )
    );


    addQuery(
        cleanTitle
    );


    if (
        cleanArtist
    ) {

        addQuery(
            cleanArtist
        );

    }


    return [
        ...queries
    ];

}


async function fetchSoundCloudSearchResults(
    query,
    accessToken
) {

    const url =
        new URL(
            "https://api.soundcloud.com/tracks"
        );


    url.searchParams.set(
        "q",
        query
    );


    url.searchParams.set(
        "access",
        "playable"
    );


    url.searchParams.set(
        "limit",
        "20"
    );


    url.searchParams.set(
        "linked_partitioning",
        "true"
    );


    const response =
        await fetch(

            url,

            {

                headers: {

                    "Authorization":
                        `OAuth ${accessToken}`,

                    "Accept":
                        "application/json; charset=utf-8"

                }

            }

        );


    const data =
        await response.json();


    if (
        !response.ok
    ) {

        throw new Error(

            `SoundCloud search failed for query "${
                query
            }": ${
                JSON.stringify(
                    data
                )
            }`

        );

    }


    return (
        data.collection ??
        []
    )
        .filter(
            track =>
                track &&
                track.kind ===
                    "track" &&
                track.id &&
                track.access ===
                    "playable"
        )
        .map(
            track =>
                mapSoundCloudCandidate(
                    track,
                    {
                        artist:
                            query
                                .split(
                                    " "
                                )
                                .slice(
                                    0,
                                    -1
                                )
                                .join(
                                    " "
                                )
                            ||
                            "",
                        title:
                            query
                                .split(
                                    " "
                                )
                                .slice(
                                    -1
                                )
                                .join(
                                    " "
                                )
                            ||
                            query
                    }
                )
        );

}


async function searchSoundCloud(
    artist,
    title,
    env
) {

    const accessToken =
        await getSoundCloudAccessToken(
            env
        );


    const queries =
        buildSoundCloudSearchQueries(
            artist,
            title
        );


    const resultsById =
        new Map();


    for (
        const query
        of queries
    ) {

        const queryResults =
            await fetchSoundCloudSearchResults(
                query,
                accessToken
            );


        for (
            const candidate
            of queryResults
        ) {

            if (
                !candidate ||
                !candidate.id
            ) {

                continue;

            }


            if (
                !resultsById.has(
                    candidate.id
                )
            ) {

                resultsById.set(
                    candidate.id,
                    candidate
                );

            }

        }

    }


    const results =
        [
            ...resultsById.values()
        ]
            .map(
                candidate => ({
                    ...candidate,
                    score:
                        scoreSoundCloudResult(
                            {
                                artist,
                                title
                            },
                            {
                                title:
                                    candidate.title,
                                user:
                                    {
                                        username:
                                            candidate.artist
                                    },
                                publisher_metadata:
                                    {
                                        artist:
                                            candidate.artist
                                    },
                                duration:
                                    candidate.duration,
                                access:
                                    candidate.access
                            }
                        )
                })
            )
            .sort(
                (
                    first,
                    second
                ) =>
                    second.score -
                    first.score
            );


    const bestCandidate =
        results[0]
        ??
        null;


    const matched =
        Boolean(
            bestCandidate &&
            bestCandidate.score >=
                35
        );


    return {

        matched,

        result:
            matched
                ? bestCandidate
                : null,

        bestCandidate,

        results:
            results.slice(
                0,
                10
            )

    };

}


// ============================================================
// SOUND CLOUD TRACK ID NORMALIZATION
// ============================================================

function normalizeSoundCloudTrackId(
    trackId
) {

    if (
        trackId ===
        null ||
        trackId ===
            undefined
    ) {

        return null;

    }


    const text =
        String(
            trackId
        )
            .trim();


    if (!text) {

        return null;

    }


    const urnMatch =
        text.match(
            /^soundcloud:tracks:(\d+)$/i
        );


    if (
        urnMatch
    ) {

        return urnMatch[1];

    }


    return /^\d+$/.test(
        text
    )
        ? text
        : null;

}


// ============================================================
// SOUNDCLOUD STREAM RESOLUTION
// ============================================================

async function getSoundCloudStream(
    trackId,
    env
) {

    const normalizedTrackId =
        normalizeSoundCloudTrackId(
            trackId
        );


    if (!normalizedTrackId) {

        throw new Error(
            "SoundCloud track ID is invalid."
        );

    }

    const accessToken =
        await getSoundCloudAccessToken(
            env
        );


    /*
        Current SoundCloud API provides the stream/transcoding
        resources through /tracks/:id/streams.
    */

    const response =
        await fetch(

            `https://api.soundcloud.com/tracks/${
                encodeURIComponent(
                    normalizedTrackId
                )
            }/streams`,

            {

                headers: {

                    "Authorization":
                        `OAuth ${accessToken}`,

                    "Accept":
                        "application/json; charset=utf-8"

                }

            }

        );


    const data =
        await response.json();


    if (
        !response.ok
    ) {

        throw new Error(

            `SoundCloud stream lookup failed: ${
                JSON.stringify(
                    data
                )
            }`

        );

    }


    /*
        Some API responses expose transcodings as an array.
    */

    const transcodings =
        Array.isArray(
            data.transcodings
        )
            ? data.transcodings
            : [];


    if (
        transcodings.length ===
        0
    ) {

        throw new Error(
            "SoundCloud returned no usable transcoding."
        );

    }


    /*
        Prefer a progressive HTTP stream when available,
        otherwise fall back to the first usable stream.
    */

    const progressive =
        transcodings.find(
            transcoding => {

                const protocol =
                    transcoding
                        ?.format
                        ?.protocol
                        ?.toLowerCase();


                return (
                    protocol ===
                    "progressive"
                );

            }
        );


    const selected =
        progressive
        ??
        transcodings.find(
            transcoding =>
                transcoding?.url
        )
        ??
        null;


    if (
        !selected ||
        !selected.url
    ) {

        throw new Error(
            "SoundCloud returned no stream URL."
        );

    }


    return {

        streamUrl:
            selected.url,

        mimeType:
            selected.format
                ?.mime_type
            ??
            null,

        protocol:
            selected.format
                ?.protocol
            ??
            null,

        originalUrl:
            selected.url

    };

}


// ============================================================
// SOUNDCLOUD STREAM PROXY
// ============================================================

async function proxySoundCloudStream(
    request,
    trackId,
    env,
    origin
) {

    const normalizedTrackId =
        normalizeSoundCloudTrackId(
            trackId
        );


    if (
        !normalizedTrackId
    ) {

        return json(
            {

                error:
                    "Invalid SoundCloud track ID."

            },
            400,
            origin
        );

    }


    const stream =
        await getSoundCloudStream(
            normalizedTrackId,
            env
        );


    const upstreamHeaders = {

        "Accept":
            "*/*"

    };


    const range =
        request.headers.get(
            "Range"
        );


    if (
        range
    ) {

        upstreamHeaders.Range =
            range;

    }


    /*
        The transcoding URL can require the OAuth
        authorization inherited from the API request.
    */

    const accessToken =
        await getSoundCloudAccessToken(
            env
        );


    upstreamHeaders.Authorization =
        `OAuth ${accessToken}`;


    const upstream =
        await fetch(

            stream.streamUrl,

            {

                headers:
                    upstreamHeaders

            }

        );


    /*
        Some SoundCloud stream URLs can redirect to the
        actual media URL. If so, retry without the OAuth
        header because the CDN URL itself may not accept it.
    */

    if (
        !upstream.ok &&
        (
            upstream.status ===
                401 ||
            upstream.status ===
                403
        )
    ) {

        const retryHeaders = {};

        if (
            range
        ) {

            retryHeaders.Range =
                range;

        }


        const retry =
            await fetch(

                stream.streamUrl,

                {

                    headers:
                        retryHeaders

                }

            );


        if (
            retry.ok ||
            retry.status ===
                206
        ) {

            return buildStreamResponse(
                retry,
                origin
            );

        }

    }


    if (
        !upstream.ok
    ) {

        let details =
            "";


        try {

            details =
                await upstream.text();

        } catch {

            // Ignore.

        }


        return new Response(

            details ||
            "SoundCloud stream failed.",

            {

                status:
                    upstream.status,

                headers: {

                    "Content-Type":
                        "text/plain; charset=UTF-8",

                    ...corsHeaders(
                        origin
                    )

                }

            }

        );

    }


    return buildStreamResponse(
        upstream,
        origin
    );

}


// ============================================================
// BUILD STREAM RESPONSE
// ============================================================

function buildStreamResponse(
    upstream,
    origin
) {

    const headers =
        new Headers();


    const headersToCopy = [

        "Content-Type",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "Cache-Control",
        "ETag",
        "Last-Modified"

    ];


    for (
        const header
        of headersToCopy
    ) {

        const value =
            upstream.headers.get(
                header
            );


        if (
            value
        ) {

            headers.set(
                header,
                value
            );

        }

    }


    const cors =
        corsHeaders(
            origin
        );


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            cors
        )
    ) {

        headers.set(
            key,
            value
        );

    }


    return new Response(

        upstream.body,

        {

            status:
                upstream.status,

            headers

        }

    );

}


// ============================================================
// YOUTUBE SEARCH
// ============================================================

async function searchYouTube(
    artist,
    title,
    env
) {

    if (
        !env.YOUTUBE_API_KEY
    ) {

        throw new Error(
            "YOUTUBE_API_KEY is missing."
        );

    }


    const query =
        `${artist} ${title}`.trim();


    const youtubeUrl =
        new URL(
            "https://www.googleapis.com/youtube/v3/search"
        );


    youtubeUrl.searchParams.set(
        "part",
        "snippet"
    );


    youtubeUrl.searchParams.set(
        "q",
        query
    );


    youtubeUrl.searchParams.set(
        "type",
        "video"
    );


    youtubeUrl.searchParams.set(
        "videoEmbeddable",
        "true"
    );


    youtubeUrl.searchParams.set(
        "maxResults",
        "5"
    );


    youtubeUrl.searchParams.set(
        "key",
        env.YOUTUBE_API_KEY
    );


    const response =
        await fetch(
            youtubeUrl
        );


    const data =
        await response.json();


    if (
        !response.ok
    ) {

        throw new Error(

            `YouTube search failed: ${
                JSON.stringify(
                    data
                )
            }`

        );

    }


    const results =
        (
            data.items ??
            []
        )

            .filter(
                item =>
                    item.id?.videoId
            )

            .map(
                item => ({

                    videoId:
                        item.id.videoId,

                    title:
                        item.snippet?.title
                        ??
                        "",

                    channelTitle:
                        item.snippet
                            ?.channelTitle
                        ??
                        "",

                    thumbnail:
                        item.snippet
                            ?.thumbnails
                            ?.high
                            ?.url
                        ??
                        item.snippet
                            ?.thumbnails
                            ?.medium
                            ?.url
                        ??
                        item.snippet
                            ?.thumbnails
                            ?.default
                            ?.url
                        ??
                        null

                })
            );


    return results;

}


// ============================================================
// ROUTER
// ============================================================

export default {

    async fetch(
        request,
        env
    ) {

        const url =
            new URL(
                request.url
            );


        const origin =
            request.headers.get(
                "Origin"
            );


        // ----------------------------------------------------
        // CORS PREFLIGHT
        // ----------------------------------------------------

        if (
            request.method ===
            "OPTIONS"
        ) {

            return new Response(
                null,
                {

                    status:
                        204,

                    headers:
                        corsHeaders(
                            origin
                        )

                }
            );

        }


        // ----------------------------------------------------
        // ONLY GET
        // ----------------------------------------------------

        if (
            request.method !==
                "GET"
        ) {

            return json(
                {

                    error:
                        "Method not allowed."

                },
                405,
                origin
            );

        }


        // ----------------------------------------------------
        // SPOTIFY LOGIN
        // ----------------------------------------------------

        if (
            url.pathname ===
            "/spotify/login"
        ) {

            return spotifyLogin(
                request,
                env
            );

        }


        // ----------------------------------------------------
        // SPOTIFY CALLBACK
        // ----------------------------------------------------

        if (
            url.pathname ===
            "/spotify/callback"
        ) {

            return spotifyCallback(
                request,
                env
            );

        }


        // ----------------------------------------------------
        // SPOTIFY SONGS
        // ----------------------------------------------------

        if (
            url.pathname ===
            "/api/songs"
        ) {

            try {

                const songs =
                    await getSpotifySongs(
                        env
                    );


                return json(
                    {

                        songs

                    },
                    200,
                    origin
                );

            } catch (
                error
            ) {

                console.error(
                    "Spotify error:",
                    error
                );


                return json(
                    {

                        error:
                            "Could not load Spotify playlist.",

                        details:
                            error.message

                    },
                    500,
                    origin
                );

            }

        }


        // ----------------------------------------------------
        // SOUNDCLOUD SEARCH
        // ----------------------------------------------------

        if (
            url.pathname ===
            "/api/soundcloud"
        ) {

            const artist =
                url.searchParams
                    .get(
                        "artist"
                    )
                    ?.trim()
                ??
                "";


            const title =
                url.searchParams
                    .get(
                        "title"
                    )
                    ?.trim()
                ??
                "";


            if (
                !artist &&
                !title
            ) {

                return json(
                    {

                        error:
                            "Missing artist/title."

                    },
                    400,
                    origin
                );

            }


            const query =
                `${artist} ${title}`.trim();


            if (
                query.length >
                200
            ) {

                return json(
                    {

                        error:
                            "Query too long."

                    },
                    400,
                    origin
                );

            }


            try {

                const result =
                    await searchSoundCloud(

                        artist,
                        title,
                        env

                    );


                return json(
                    {

                        matched:
                            result.matched,

                        result:
                            result.result,

                        bestCandidate:
                            result.bestCandidate,

                        results:
                            result.results

                    },
                    200,
                    origin
                );

            } catch (
                error
            ) {

                console.error(
                    "SoundCloud search error:",
                    error
                );


                return json(
                    {

                        error:
                            "SoundCloud search failed.",

                        details:
                            error.message

                    },
                    500,
                    origin
                );

            }

        }


        // ----------------------------------------------------
        // SOUNDCLOUD STREAM
        // ----------------------------------------------------

        if (
            url.pathname ===
            "/api/soundcloud/stream"
        ) {

            const trackId =
                url.searchParams
                    .get(
                        "track"
                    )
                    ?.trim()
                ??
                "";


            try {

                /*
                    First resolve the actual stream URL.

                    The frontend receives the Worker URL as
                    streamUrl so the browser never needs to know
                    the SoundCloud OAuth credentials.
                */

                const normalizedTrackId =
                    normalizeSoundCloudTrackId(
                        trackId
                    );


                if (
                    !normalizedTrackId
                ) {

                    return json(
                        {

                            error:
                                "Invalid track parameter."

                        },
                        400,
                        origin
                    );

                }


                const streamUrl =
                    new URL(
                        request.url
                    );


                streamUrl.searchParams.set(
                    "track",
                    normalizedTrackId
                );


                streamUrl.searchParams.set(
                    "proxy",
                    "1"
                );


                /*
                    If proxy=1 is present, stream actual media.
                */

                if (
                    url.searchParams.get(
                        "proxy"
                    ) ===
                    "1"
                ) {

                    return await proxySoundCloudStream(

                        request,
                        trackId,
                        env,
                        origin

                    );

                }


                /*
                    Otherwise return the Worker proxy URL.
                */

                await getSoundCloudStream(
                    normalizedTrackId,
                    env
                );


                return json(
                    {

                        trackId:
                            normalizedTrackId,

                        streamUrl:
                            streamUrl.toString(),

                        proxy:
                            true

                    },
                    200,
                    origin
                );

            } catch (
                error
            ) {

                console.error(
                    "SoundCloud stream error:",
                    error
                );


                return json(
                    {

                        error:
                            "SoundCloud stream failed.",

                        details:
                            error.message

                    },
                    500,
                    origin
                );

            }

        }


        // ----------------------------------------------------
        // YOUTUBE SEARCH
        // ----------------------------------------------------

        if (
            url.pathname ===
            "/api/youtube"
        ) {

            const artist =
                url.searchParams
                    .get(
                        "artist"
                    )
                    ?.trim()
                ??
                "";


            const title =
                url.searchParams
                    .get(
                        "title"
                    )
                    ?.trim()
                ??
                "";


            if (
                !artist &&
                !title
            ) {

                return json(
                    {

                        error:
                            "Missing artist/title."

                    },
                    400,
                    origin
                );

            }


            const query =
                `${artist} ${title}`.trim();


            if (
                query.length >
                200
            ) {

                return json(
                    {

                        error:
                            "Query too long."

                    },
                    400,
                    origin
                );

            }


            try {

                const results =
                    await searchYouTube(

                        artist,
                        title,
                        env

                    );


                return json(
                    {

                        query,

                        results

                    },
                    200,
                    origin
                );

            } catch (
                error
            ) {

                console.error(
                    "YouTube error:",
                    error
                );


                return json(
                    {

                        error:
                            "YouTube search failed.",

                        details:
                            error.message

                    },
                    500,
                    origin
                );

            }

        }


        // ----------------------------------------------------
        // NOT FOUND
        // ----------------------------------------------------

        return json(
            {

                error:
                    "Not found."

            },
            404,
            origin
        );

    }

};