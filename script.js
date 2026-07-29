const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const clipContainer = document.getElementById("clip-container");



/* TALLÓZÁS */


dropZone.addEventListener("click", () => {

    fileInput.click();

});



fileInput.addEventListener("change", () => {

    handleFiles(fileInput.files);

});





/* DRAG & DROP */


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






function handleFiles(files) {


    for(const file of files) {


        if(file.type.startsWith("video/")) {


            createClipCard(file);


        }


    }


}






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





    const expand = card.querySelector(".expand");

    const filename = card.querySelector(".filename");

    const comment = card.querySelector(".comment");

    const counter = card.querySelector(".counter");

    const deleteButton = card.querySelector(".delete");






    expand.onclick = () => {


        card.classList.toggle("collapsed");



        if(card.classList.contains("collapsed")) {


            filename.disabled = true;

            expand.textContent="▼";


        }

        else {


            filename.disabled=false;

            filename.focus();

            expand.textContent="▲";


        }


    };






    comment.oninput = () => {


        counter.textContent =
        `${comment.value.length} / 500`;


    };






    deleteButton.onclick = () => {


        card.remove();


    };



}







function formatSize(bytes) {


    if(bytes < 1024)

        return bytes + " B";



    if(bytes < 1024 * 1024)

        return (bytes / 1024).toFixed(1) + " KB";



    return (bytes / 1024 / 1024).toFixed(1) + " MB";


}