if(navigator.userAgent.indexOf("Firefox") == -1){
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'it-IT';
    const inputBox = document.querySelector("#inputBox")

    const speech = document.querySelector(".inputButton");
    let isOn = false;

    speech.onclick = function (){
        if (speech.classList.contains("speech") && justSent === false) OnOff();
    }

    function OnOff(){
        if (isOn == false){ //in ascolto
            recognition.start();
            isOn = true;
            speech.style.backgroundColor = "#ff5722"
            speech.classList.remove('off');
            speech.classList.add('on');
            generateTypingMsg('user');
            console.log('Ascolto');
        }
        else if (isOn == true){ //NON in ascolto
            recognition.stop();
            isOn = false;
            speech.style.backgroundColor = "#42a5f5";
            speech.classList.remove('on');
            speech.classList.add('off');
            try{
                document.querySelector('.isTyping').remove();
            } catch(e){
                console.log(e)
            }
            console.log('Fine Cliccata');
        }
    }
    recognition.addEventListener('audioend', function() {
        speech.style.backgroundColor = "rgb(66, 165, 245)";
        isOn = false;
        document.querySelector('.isTyping').remove();
        console.log('Fine Rilevata');
    });
    recognition.onresult = function(event) {
        const result = [event.results[0][0].transcript];
        inputBox.value = result;
        generateUserMsg();
    }
}
//======================================== Speech Syntesi ================================//


let canTalk = false;
const soundWave = document.querySelector('.sonar-wrapper');
function readMessage(toRead){
    ///toRead -> array di frasi da leggere
    if(canTalk){
        soundWave.style.display = 'block'
        let sintesi = new SpeechSynthesisUtterance();
        sintesi.lang = 'it';
        toRead.forEach(el => {
            sintesi.text = el;
            speechSynthesis.speak(sintesi);
        });
    }
    setInterval(() => {
        if(!speechSynthesis.speaking) {
            soundWave.style.display = 'none';
            clearInterval();
        }
    }, 500);
}

const speakerBtn = document.querySelector('.speaker');
speakerBtn.addEventListener('click', mute);

function mute(){
    if (speakerBtn.classList.contains('isOn')){ //se la lettura dei messaggi è abilitata
        speakerBtn.classList.replace('isOn', 'isOff');
        speakerBtn.src = 'icons/speaker-mute.png';
        speechSynthesis.cancel();
        canTalk = false;
    }else{
        speakerBtn.classList.replace('isOff', 'isOn');
        speakerBtn.src = 'icons/speaker.png';
        canTalk = true;
    }
}
/* sintesi.text = "Ciao, come stai?"
speechSynthesis.speak(sintesi); */