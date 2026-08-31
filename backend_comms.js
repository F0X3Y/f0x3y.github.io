


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

