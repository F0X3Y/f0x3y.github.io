


function get_token() {
    return sessionStorage.getItem("token")
    
}

async function login(url,username,pswd){//bejelentkezés
    password=await hexdigest(pswd)

    response=await fetch(url+"/challenge",{headers:{"username":username}})
    number=await response.text()
    console.log(password)
    returnHash=await hexdigest(password+number)
    console.log(returnHash)

    loginrq=await fetch(url+"/login",{method:"POST",headers:{"username":username,"password":returnHash}})
    if (loginrq.status==200){
        console.log("logged in")
        sessionStorage.setItem("token",await loginrq.text())
    }

}

async function hexdigest(str) {
    console.log(str)
    bytes=new Uint8Array(await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)))
    returnHash=[...bytes].map(b => b.toString(16).padStart(2, "0")).join("")
    return returnHash
}

async function signup(url,username,pswd){//regisztrálláss
    password=await hexdigest(pswd)
    body=JSON.stringify({"username":username,"password":password})
    await fetch(url+"/register",{method:"POST",
        headers:{"Content-length":body.length},
        body:body
    })

    await login(url,username,pswd)
}

async function get_username(url) {
    result=await fetch(url+"/username",{method:"GET",
        headers:{"token":get_token()}
    })
    if (result.status==200){
        return await result.text()
    }

    return "Nincs bejelentkezve"
}

async function get_videos(url,page=1){
    //lists video names (1 page is 3 videos, pages start from 1)
    //to be used in to_thumbnail_link() and to_video_link()
    //only returns videos of currently logged in user
    //returns list of strings ["","",""]
    //
    //magyarul: 
    // video lista
    // 1 oldal=3 video de tudom állítani ezt szerveren
    // csak saját videóidat adja ki (amilyen néven be vagy jelentkezve)
    // visszadob egy stringekkel teli listát ["név1","név2","valami"]
    //
    // Amúgy meg valamiért sokkal könnyeb először angolul leírni utána magyarul nemtom miért

    if (!page){
        page=1
    }
    console.log(page)
    result=await fetch(url+"videos/"+page,
        {method:"GET",
            headers:{"token":get_token()}
        })
    return await result.json()
}
function to_thumbnail_link(url,video_name){
    //Turn video names into links to thumbnails (session token in link so it knows who is signed in)
    // magyarul: videó nevéből csinál thumbnail linket (session token a linkben)
    return url+"thumbnail/"+video_name+"?token="+get_token()
}
function to_video_link(url,video_name){
    //Turn video names into links to videos (session token in link so it knows who is signed in)
    // magyarul: videó nevéből csinál video linket (session token a linkben)
    return url+"video/"+video_name+"?token="+get_token()
}