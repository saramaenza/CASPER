import { append } from "express/lib/response";
import jwt_decode from "./jwt-decode";
const msgContainer = document.querySelector('#msgContainer');
//const sendButton = document.querySelector('#send');
const queryText = document.querySelector("#inputBox");
const inputButton = document.querySelector(".inputButton");
const buttonIcon = document.querySelector(".buttonIcon");

const lang = Cookies.get("lang");
const tokenRaw = Cookies.get("auth_token");
const token = jwt_decode(token);
let justSent = false;


// ===================== Message Generator =======================//
inputButton.addEventListener('click', (event)=>{
    if (inputButton.classList.contains("send")) {
        generateUserMsg();
        justSent = true;
    }
})
function generateUserMsg(){
    let textValue = queryText.value;
    if(textValue !== ""){
        const userMsgContainer = document.createElement('div');
        userMsgContainer.classList.add('userMsgContainer'); //contiene il div del testo e il div dell'avatar

        const userMsg = document.createElement('div');
        userMsg.classList.add('userMsg');

        const userImg = document.createElement("IMG");
        userImg.setAttribute("src", "icons/user.png");
        userImg.classList.add('userImg');
        
        let text = document.createTextNode(textValue);
        getBotResponse(textValue)
        queryText.value = ""

        
        userMsg.appendChild(text);
        userMsgContainer.appendChild(userMsg);
        userMsgContainer.appendChild(userImg);
        msgContainer.appendChild(userMsgContainer);
        
        userMsgContainer.scrollIntoView()
        generateTypingMsg('bot');
        buttonIcon.src = "icons/microphone.png"
        inputButton.className = "inputButton speech"
    }
}

function generateTypingMsg(type){//type = user | bot
  
    const MsgContainer = document.createElement('div');
    MsgContainer.classList.add(`${type}MsgContainer`); //contiene il div del testo e il div dell'avatar
    MsgContainer.classList.add('isTyping');

    const Msg = document.createElement('div');
    Msg.classList.add(`${type}Msg`);

    const Img = document.createElement("IMG");
    Img.setAttribute("src", `icons/${type}.png`);
    Img.classList.add(`${type}Img`);
    
    const typeGif = document.createElement("IMG");
    typeGif.setAttribute("src", "icons/typing.gif");
    typeGif.className = "typeGif";

    Msg.appendChild(typeGif);
    if (type === 'user'){
        MsgContainer.appendChild(Msg);
        MsgContainer.appendChild(Img);
    }else{
        MsgContainer.appendChild(Img);
        MsgContainer.appendChild(Msg);
    }
    
    msgContainer.appendChild(MsgContainer);
    
    MsgContainer.scrollIntoView()
}

async function getBotResponse(query){
    let id = token.sessionId;
    //let id = document.querySelector('#chatHidden').getAttribute('session-id');
    if(query.value !== ""){
        fetch(`http://127.0.0.1:5000/send_message?message=${query}&user_id=${id}`)
        .then(response => response.json())
        .then(data => {
            return generateBotMsg(data); //data = {response_text: fulfillment message, lang: lang message}
        })
        .catch(error =>{
            return generateBotMsg([{"platform":"PLATFORM_UNSPECIFIED","text":{"text":["Scusa, ma qualcosa è andato storto 😕"]},"message":"text"},{"platform":"PLATFORM_UNSPECIFIED","text":{"text":["Riprova a mandare il messaggio"]},"message":"text"}])
        });
    }
}



async function _generateBotMsg(messages){
    /*
    Deprecated.
    */
    let text = "";
    const toRead = []; //array di frasi da leggere dalla sintesi vocale
    let sent = false;
    const lang = Cookies.get("lang");
    //const lang = messages.lang;
    let currentMessage = '';
    let newMsg;
    let i = 0;
    for (const el of messages['api']){
        i++;
    //messages['api'].forEach(async (el, i) => {
        currentMessage = el.text.text[0];
        if(currentMessage !== ""){
            try{
                if(i === 0) clearInterval();
            }catch(err){
                console.log(err);
            }
            sent = true;
            const botMsgContainer = document.createElement('div');
            botMsgContainer.classList.add('botMsgContainer'); //contiene il div del testo e il div dell'avatar

            const botMsg = document.createElement('div');
            botMsg.classList.add('botMsg');

            const botImg = document.createElement("IMG");
            botImg.setAttribute("src", "icons/bot.png");
            botImg.classList.add('botImg');

            text = document.createTextNode(currentMessage);
            botMsg.appendChild(text);
            botMsgContainer.appendChild(botImg);
            botMsgContainer.appendChild(botMsg);
            msgContainer.appendChild(botMsgContainer);

            botMsgContainer.scrollIntoView()
            toRead.push(el.text.text[0])
        }
    }
    //});
    /* if(sent){
        console.log("entro in SENT") */
    if(document.querySelector('.isTyping') != null) document.querySelector('.isTyping').remove();
    //}
    justSent = false;
    readMessage(toRead);
}

function generateBotMsg(messages){
    let text = "";
    const toRead = []; //array di frasi da leggere dalla sintesi vocale
    let sent = false;
    const lang = Cookies.get("lang") || "it";
    //const lang = messages.lang;
    let currentMessage = '';
    let newMsg;
    if (Array.isArray(messages)){
        for (const el of messages['response_text']){
            appendBotMessage(el)
            toRead.push(el)
            }
    }else{
        appendBotMessage(messages['response_text'])
        toRead.push(messages['response_text'])
    }
    if(document.querySelector('.isTyping') != null) document.querySelector('.isTyping').remove();
    justSent = false;
    readMessage(toRead);
}

function appendBotMessage(message){
    currentMessage = el.text.text[0];
    sent = true;
    const botMsgContainer = document.createElement('div');
    botMsgContainer.classList.add('botMsgContainer'); //contiene il div del testo e il div dell'avatar

    const botMsg = document.createElement('div');
    botMsg.classList.add('botMsg');

    const botImg = document.createElement("IMG");
    botImg.setAttribute("src", "icons/bot.png");
    botImg.classList.add('botImg');

    text = document.createTextNode(currentMessage);
    botMsg.appendChild(text);
    botMsgContainer.appendChild(botImg);
    botMsgContainer.appendChild(botMsg);
    msgContainer.appendChild(botMsgContainer);

    botMsgContainer.scrollIntoView()
    
}
// ========================= InputButton Change ===================== //
queryText.addEventListener("keyup", (event) =>{
    if (queryText.value !== ""){
        buttonIcon.src = "icons/send.png"
        inputButton.className = "inputButton send"
    }else{
        buttonIcon.src = "icons/microphone.png"
        inputButton.className = "inputButton speech"
    }
    if (event.keyCode == 13) generateUserMsg();
});
