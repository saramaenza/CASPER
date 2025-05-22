
//import jwt_decode from "./jwt-decode";
const lang = Cookies.get("lang");
const tokenRaw = Cookies.get("auth-token");
const chat_session_id = Cookies.get("chat_session_id");
const token = jwt_decode(tokenRaw);
const userId = token.id;
//const name = token.name.charAt(0).toUpperCase() + token.name.slice(1);
const userName = token.name;
let isReminderText = false;

const base_link = window.location.origin;
const getRuleList = `${base_link}/get_rule_list`; // chiamata POST per ricevere la lista delle regole
const getDevices = `${base_link}/get_config`; // chiamata POST per ricevere la lista delle regole
const sendMessage = `${base_link}/send_message`; // chiamata POST per ricevere la lista delle regole
const changeRule = `${base_link}/changeRule`; // chiamata POST per aggiornare le regole dopo il cancellamento
const getProblemList = `${base_link}/get_problems`; // chiamata GET per ricevere la lista dei problemi
const getGoals = `${base_link}/get_goals`; // chiamata POST per ricevere la lista dei goal
const ping = `${base_link}/get_chat_state`; // chiamata POST per ricevere la lista dei goal
const downButton = document.querySelector("#download");
const aggiorna = document.querySelector("#aggiorna");
let currentIndex = 0;
const carousel = document.querySelector(".carousel");
let carouselItems = document.querySelectorAll(".carousel__item");
const [btnLeftCarousel, btnRightCarousel] = document.querySelectorAll(
  ".carousel-button"
);
let carouselCount = carouselItems.length;
let pos = 0;
let translateX = 0;

// Immagine del profilo a pallina
//const userProfile = document.querySelector('#profile');
const initial = document.querySelector('#initial-name');
//const profileInfo = document.querySelector('#profile-info');
const reset = document.querySelector('#reset');


const sse = new EventSource("/sse");

const sendPing = async () => {
  const response = await fetch(ping, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({"action":"ping", "state": "", "id":null, "session_id": chat_session_id, "user_id": userId})
  });
  return 
}
setInterval(() => {
  sendPing();
}, 600000);


sse.addEventListener("message", async ({ data }) => {
  const message = JSON.parse(data);
  if (message.action == "add-state") {
    addChatState(message.state, message.id);
  } else if (message.action == "confirm-state") {
    confirmChatState(message.state, message.id);
  } else if (message.action == "error-state") {
    errorChatState(message.state, message.id);
  } else if (message.action == "send-message") {
    generateSSEBotMessage({"text": [message.state]});
  }
  else if (message.action == "update-automation-list") {
    rulesList = await getRulesParam()
    printUserRule(rulesList)
  }
  else if (message.action == "update-problems") {
    //message.state = []
    let problemsList = await getProblems()
    printUserProblems(problemsList);
  }
  else if (message.action == "ping") {
    console.log("Keep alive");
  }
 });

const rulesContainer = document.querySelector('#rules-container');
const problemsContainer = document.querySelector('#problems-main-container');
const devicesContainer = document.querySelector('#devices-list-container');

document.getElementById('show-rules').addEventListener('click', function() {
  if (this.classList.contains('selector-selected')) return;
  else {
    this.classList.remove('selector-unselected'); 
    this.classList.add('selector-selected'); 
    document.getElementById('show-devices').classList.remove('selector-selected');
    document.getElementById('show-devices').classList.add('selector-unselected');
    document.getElementById('show-problems').classList.remove('selector-selected');
    document.getElementById('show-problems').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-unselected');
  rulesContainer.classList.add('leftbar-selected');
  devicesContainer.classList.remove('leftbar-selected');
  devicesContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.remove('leftbar-selected');
  problemsContainer.classList.add('leftbar-unselected');
});

document.getElementById('show-devices').addEventListener('click', function() {
  if (this.classList.contains('selector-selected')) return;
  else {
    this.classList.remove('selector-unselected'); 
    this.classList.add('selector-selected'); 
    document.getElementById('show-rules').classList.remove('selector-selected');
    document.getElementById('show-rules').classList.add('selector-unselected');
    document.getElementById('show-problems').classList.remove('selector-selected');
    document.getElementById('show-problems').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-selected');
  rulesContainer.classList.add('leftbar-unselected');
  devicesContainer.classList.remove('leftbar-unselected');
  devicesContainer.classList.add('leftbar-selected');
  problemsContainer.classList.remove('leftbar-selected');
  problemsContainer.classList.add('leftbar-unselected');
});

document.getElementById('show-problems').addEventListener('click', function() {
  if(this.classList.contains('selector-selected')) return;
  else {
    this.classList.remove('selector-unselected'); 
    this.classList.add('selector-selected'); 
    document.getElementById('show-devices').classList.remove('selector-selected');
    document.getElementById('show-devices').classList.add('selector-unselected');
    document.getElementById('show-rules').classList.remove('selector-selected');
    document.getElementById('show-rules').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-selected');
  rulesContainer.classList.add('leftbar-unselected');
  devicesContainer.classList.remove('leftbar-selected');
  devicesContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.remove('leftbar-unselected');
  problemsContainer.classList.add('leftbar-selected');
});

let rulesList;
window.addEventListener('load', async ()=>{
  initial.innerHTML = `Ciao, <b>${userName}</b>`;
  let chatID = document.createElement('p');
  chatID.innerHTML = `Chat ID: <b>${chat_session_id}</b>`;
  chatID.style.fontSize = '0.5em';
  initial.appendChild(chatID);
  let rulesList = await getRulesParam() //GET regole
  //problemList = await getData(`${getProblems}?id=${userId}`) //GET problemi
  let devicesList = await getData(`${getDevices}?id=${userId}`) //GET problemi
  //goalList = await getData(`${getGoals}?id=${userId}`) //GET goal
  

  printUserRule(rulesList); //PRINT regole
  printUserDevices(devicesList); //PRINT devices
  //await printUserProblems(problemList);
  //await printUserGoals(goalList); 
  
  //open_delete_rule();

  if (lang == 'en'){
    getBotResponse('hello my dear');
    generateTypingMsg('bot');
  }else{
    //getBotResponse('ciao, chi sei?');
    //generateTypingMsg('bot');
  }

})

/*
logoutButton = document.querySelector('#logout');
logoutButton.addEventListener('click', ()=>{
  Cookies.remove('auth-token');
  location.reload();
})*/
//--------------------POST & GET FUNCTION----------------------------------
//effettua POST generici verso il server
async function postData(data, url) {
  let id = userId;
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({data, id})
    })
    .then(response => response.json())
    .then(data => {
      resolve(data); // Risolve la promessa con i dati desiderati
    })
    .catch(error => {
      console.log(error);
      reject(error); // Reietta la promessa in caso di errore
    });
  });
}

async function deleteAutomation(rule_id) {
  let id = userId;
  await new Promise((resolve, reject) => {
    fetch('/delete_rule', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({rule_id, id})
    })
    .then(response => response.json())
    .then(data => {
      resolve(data); // Risolve la promessa con i dati desiderati
    })
    .catch(error => {
      console.log(error);
      reject(error); // Reietta la promessa in caso di errore
    });
  });
  let rulesList = await getRulesParam() //GET regole
  printUserRule(rulesList);
}
  
  //effettua GET generici dal server
  async function getData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }
  
  function getRulesParam() {
    return new Promise((resolve, reject) => {
      fetch(getRuleList, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({"user_id": userId})
      })
      .then(response => response.json())
      .then(data => {
        resolve(data); // Risolve la promessa con i dati desiderati
      })
      .catch(error => {
        console.log(error);
        reject(error); // Reietta la promessa in caso di errore
      });
    });
  }

   function getProblems() {
    return new Promise((resolve, reject) => {
      fetch(getProblemList, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({"user_id": userId})
      })
      .then(response => response.json())
      .then(data => {
        resolve(data); // Risolve la promessa con i dati desiderati
      })
      .catch(error => {
        console.log(error);
        reject(error); // Reietta la promessa in caso di errore
      });
    });
  }

async function printUserRule(rules) {

  const rulesContainer = document.querySelector('#rules-container');
  rulesContainer.innerText = '';
  if (rules.length > 0) {
    rules.forEach((element, index) => {
      element = element['config']
      setTimeout(() => {
        let rule = document.createElement('div');
        rule.classList.add('rule');

        let ruleHead = document.createElement('div');
        ruleHead.classList.add('rule-head');
        ruleHead.setAttribute('ruleid', element['id']);
        let ruleName = document.createElement('span');
        ruleName.classList.add('rule-name');
        ruleName.innerText = `${element['alias']}`;

        let ruleElement = document.createElement('div');
        ruleElement.classList.add('rule-element', 'closed', 'rule-content-wrapper');
        ruleElement.setAttribute('descid', element['id']);
  
        let ruleDescription = document.createElement('div');
        ruleDescription.classList.add('rule-description');
        ruleDescription.innerHTML = element['description'] || 'Questa automazione non ha una descrizione';
        /*
        const icon = document.createElement('i');
        icon.classList.add('bx', 'bxs-trash', 'deleteButton');
        icon.id = element['id'];*/

        const idBadge = document.createElement('div');
        idBadge.textContent = `ID ${element['id']}`;
        idBadge.classList.add('id_badge');

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');

        // Crea un contenitore per lo switch
        const switchContainer = document.createElement('label');
        switchContainer.className = 'switch';

        // Crea l'input checkbox
        const switchInput = document.createElement('input');
        switchInput.type = 'checkbox';

        // Crea lo slider
        const switchSlider = document.createElement('span');
        switchSlider.className = 'slider';

        // Crea il tooltip
        switchContainer.title = "Attiva";

        // Aggiorna il tooltip quando cambia lo stato dello switch
        switchInput.addEventListener('change', function() {
          if (switchInput.checked) {
            switchContainer.title = "Disattiva";
          } else {
            switchContainer.title = "Attiva";
          }
        });

        // Assembla lo switch
        switchContainer.appendChild(switchInput);
        switchContainer.appendChild(switchSlider);

        const icon = document.createElement('i');
        icon.classList.add('bx', 'bxs-trash', 'deleteButton');
        icon.id = element['id'];
        buttonsContainer.appendChild(icon);

        buttonsContainer.appendChild(switchContainer);

        ruleHead.appendChild(ruleName);
        ruleHead.appendChild(idBadge);
        //ruleHead.appendChild(icon);
        rule.appendChild(ruleHead);
        rule.appendChild(ruleElement);
        ruleElement.appendChild(ruleDescription);
        ruleElement.appendChild(buttonsContainer);
        rulesContainer.appendChild(rule);

        // Aggiungi l'event listener per l'apertura del contenuto
        ruleHead.addEventListener('click', (event) => {
            if (
              event.target.classList.contains('rule-head') ||
              event.target.classList.contains('rule-name') ||
              event.target.classList.contains('id_badge') // aggiunto qui
            ) {
              displayDesc(ruleHead);
            } else if (event.target.classList.contains('deleteButton')) {
              if (confirm("Sei sicuro di voler eliminare l'automazione?")) {
                deleteAutomation(ruleHead.getAttribute('ruleid'));
              }
              //deleteRule(ruleHead.getAttribute('ruleid'), rulesList);
            }
         
        });
      }, index * 100); // Ritardo di 500ms tra ogni regola
    });
  } else {
    console.log("Nessuna regola associata a questo account");
    rulesContainer.innerText = 'Nessuna regola associata a questo account';
  }
}


async function printUserDevices(devicesList) {
  const devices = devicesList['selected'];
  const devicesContainer = document.querySelector('#devices-list-container');
  devicesContainer.innerHTML = '';
  let icon = domainMap['default'];
  let cleanList = {};
  if (devicesList != true && devices != undefined) { //organizzo per stanze "a", salvo il nome dell entita "f"
    devices.forEach(element => {
      const deviceClass = element['dc'] || null;
      const deviceDomain = element['t'] || null;
      icon = classMap[deviceClass] || domainMap[deviceDomain] || domainMap['default'];
      if (cleanList.hasOwnProperty(element['a'])) {
        cleanList[element['a']].push([element['f'], icon]);
      }else {
        cleanList[element['a']] = [[element['f'], icon]];
      }
    })

  } else { return "Nessun dispositivo associato a questo account"; }
  // Crea e aggiungi il titolo
  //const title = document.createElement('h3');
  //title.innerText = 'Conflitti e Catene';
  //rulesContainer.appendChild(title);
  setTimeout(() => {
  Object.keys(cleanList).forEach((key) => {
    // Crea il contenitore della stanza
    let room = document.createElement('div');
    room.classList.add('room');
    
    let roomName = document.createElement('div');
    roomName.classList.add('room-name');
    roomName.innerText = key;

    // Aggiungi il listener per il clic
    roomName.addEventListener('click', () => {
      roomName.classList.toggle('active');
      const devicesList_container = roomName.nextElementSibling;

      if (devicesList_container && devicesList_container.classList.contains('devicesList_container')) {
        // Alterna la classe 'open' per gestire l'apertura e la chiusura
        if (devicesList_container.classList.contains('open')) {
          devicesList_container.style.maxHeight = '0'; // Nascondi
          devicesList_container.classList.remove('open');
        } else {
          devicesList_container.style.maxHeight = devicesList_container.scrollHeight + 'px'; // Mostra
          devicesList_container.classList.add('open');
        }
      }
    });

    room.appendChild(roomName);

    let devicesList_container = document.createElement('div');
    devicesList_container.classList.add('devicesList_container');

    // Crea la lista dei dispositivi
    let devicesList = document.createElement('div');
    devicesList.classList.add('devices-list');
    cleanList[key].forEach((device) => {
      let deviceElement = document.createElement('div');
      let deviceText = document.createElement('span');
      let iconElement = document.createElement('i');
      iconElement.classList.add('bx', device[1]);
      deviceElement.classList.add('device-element');
      deviceText.textContent = device[0];
      deviceElement.appendChild(iconElement);
      deviceElement.appendChild(deviceText);
      devicesList.appendChild(deviceElement);
    });

    devicesList_container.appendChild(devicesList);
    room.appendChild(devicesList_container);
    devicesContainer.appendChild(room);
  });
}, 100);
}

//cancella una regola dalla lista
async function deleteRule(id, obj){
    let size = Object.keys(obj).length;
    let tmp;
    for (let i = 0; i<size; i++){
      if (obj[i].ruleid == id){
        tmp = i;
      }
    }
    obj.splice(tmp, 1);
    document.querySelector(`div [ruleid='${id}']`).parentNode.remove();
    //document.getElementById(`${id}`).parentElement.remove();
    let newsize = Object.keys(obj).length;
    for (let i = 0; i<newsize; i++){
      obj[i].id = i+1; 
    }
    postData(obj, changeRule)
  }

  // =============================================

const msgContainer = document.querySelector('#msgContainer');
const queryText = document.querySelector("#inputBox");
const inputButton = document.querySelector(".inputButton");
const buttonIcon = document.querySelector(".buttonIcon");

let justSent = false;


// ===================== Message Generator =======================//
inputButton.addEventListener('click', (event)=>{
    if (inputButton.classList.contains("send")) {
        generateUserMsg();
        justSent = true;
    }
})
function generateUserMsg(input=""){
    if (!inputButton.classList.contains("send-disabled")) {
      let textValue = ""
      if (input == "") textValue = queryText.value;
      else textValue = input;
      if(textValue !== ""){
        const userMsgContainer = document.createElement('div');
        userMsgContainer.classList.add('userMsgContainer'); //contiene il div del testo e il div dell'avatar

        const userLabel = document.createElement('div');
        userLabel.classList.add('userLabel');
        let username = document.createTextNode(name);
        userLabel.append(username);

        const userMsg = document.createElement('div');
        userMsg.classList.add('userMsg');

         /* const userImg = document.createElement("IMG");
        userImg.setAttribute("src", "icons/user.png");
        userImg.classList.add('userImg'); */
        
        let text = document.createTextNode(textValue);
        if(isReminderText) {

          getBotResponse('"'+textValue+'"');
          isReminderText = false;
        }
        else getBotResponse(textValue)
        queryText.value = ""

        
        userMsg.appendChild(text);
        userMsgContainer.appendChild(userLabel);
        userMsgContainer.appendChild(userMsg);
        msgContainer.appendChild(userMsgContainer);
        
        userMsgContainer.scrollIntoView()
        generateTypingMsg('bot');
        inputButton.classList.add('send-disabled');
        /*buttonIcon.src = "icons/microphone.png"
        inputButton.className = "inputButton speech"*/
      }
    }
}

function generateTypingMsg(type){//type = user | bot
  
    const MsgContainer = document.createElement('div');
    MsgContainer.classList.add(`${type}MsgContainer`); //contiene il div del testo e il div dell'avatar
    MsgContainer.classList.add('isTyping');

    const Msg = document.createElement('div');
    Msg.classList.add(`${type}Msg`);

    const botLabel = document.createElement('div');
    botLabel.classList.add('botLabel');
    let username = document.createTextNode("Rulebot");
    botLabel.appendChild(username);
    /* const Img = document.createElement("IMG");
    Img.setAttribute("src", `icons/${type}.png`);
    Img.classList.add(`${type}Img`); */
    
    const typeGif = document.createElement("IMG");
    typeGif.setAttribute("src", "icons/typing.gif");
    typeGif.className = "typeGif";

    Msg.appendChild(typeGif);
    if (type === 'user'){
        MsgContainer.appendChild(Msg);
        MsgContainer.appendChild(botLabel);
    }else{
        MsgContainer.appendChild(botLabel);
        MsgContainer.appendChild(Msg);
    }
    
    msgContainer.appendChild(MsgContainer);
    
    MsgContainer.scrollIntoView()
}

function addChatState(state, id){
  const box = document.createElement('div');
  const icon = document.createElement('i');
  const stateText = document.createElement('p');
  stateText.style.display = 'inline-block';
  stateText.style.margin = '0';
  stateText.textContent = state;
  stateText.id = 'text-'+id;
  box.classList.add('chat-state');
  box.id = id;
  icon.classList.add('bx', 'bxs-analyse', 'bx-spin');
  box.appendChild(icon);
  box.appendChild(stateText);
  if (document.querySelector('.isTyping') != null)
    document.querySelector('.isTyping').before(box);
  else
    msgContainer.appendChild(box);
  box.style.opacity = 0;
  setTimeout(() => {
    box.style.opacity = 1;
  }, 100);
}

function confirmChatState(state, id){
  if (document.querySelector(`#${id}`) != null){
    const box = document.querySelector(`#${id}>.bx`);
    const div = document.querySelector(`#${id}`);
    const text = document.querySelector(`#text-${id}`);
    box.classList.remove('bxs-analyse', 'bx-spin');
    box.classList.add('bx-check');
    text.textContent = state;
    div.id = '';
    text.id = '';
  }
}

function errorChatState(state, id){
  if (document.querySelector(`#${id}`) != null){
    const box = document.querySelector(`#${id}>.bx`);
    const div = document.querySelector(`#${id}`);
    const text = document.querySelector(`#text-${id}`);
    box.classList.remove('bxs-analyse', 'bx-spin');
    box.classList.add('bx-x');
    text.textContent = state;
    div.id = '';
    text.id = '';
  }
}


async function getBotResponse(query){
    let id = token.id;
    if(query.value !== ""){
        fetch(sendMessage,{
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({text: query, user_id: id, session: chat_session_id})
        })
        .then(response => response.json())
        .then(data => {
          //console.log(`Received data -> ${JSON.stringify(data)}`)
          //updateTokens(data['tokens'])
          //confirmChatState();
          return generateBotMsg({"text": [data['text']]}); //data = {api: fulfillment message, lang: lang message}
        })
        .catch(error =>{
          console.log(error)
          //errorChatState();
          return generateBotMsg({"text":["Scusa, ma qualcosa è andato storto, puoi riprovare a mandare il messaggio?"], "lang": 'it'})
        });
    }
}

async function generateSSEBotMessage(text) {
  let currentMessage = text;
  const iconsList = document.querySelectorAll('.bx');
  let lastIcon = iconsList[iconsList.length - 1];
  const botMsgContainer = document.createElement('div');
  botMsgContainer.classList.add('botMsgContainer'); //contiene il div del testo e il div dell'avatar

  const botMsg = document.createElement('div');
  botMsg.classList.add('botMsg');

  const botLabel = document.createElement('div');
  botLabel.classList.add('botLabel');
  let username = document.createTextNode("Rulebot");
  botLabel.appendChild(username);
  currentMessage = currentMessage.replace(/\*{1,3}(.*?)\*{1,3}/g, "<b>$1</b>"); //modifica *, **, *** con il grassetto
  currentMessage = currentMessage.replace(/\n/g, "<br>");
  botMsg.innerHTML = currentMessage; //aggiunge il testo al messaggio
  if (i<=1) botMsgContainer.appendChild(botLabel);
  botMsgContainer.appendChild(botMsg);
  lastIcon.after(botMsgContainer);
  //msgContainer.appendChild(botMsgContainer);

  botMsgContainer.scrollIntoView()
  
}

async function generateBotMsg(messages){
    let text = "";
    const toRead = []; //array di frasi da leggere dalla sintesi vocale
    let sent = false;
    let currentMessage = '';
    let i = 0;
    for (let el of messages['text']){
        i++;
        currentMessage = el;
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

            const botLabel = document.createElement('div');
            botLabel.classList.add('botLabel');
            let username = document.createTextNode("Rulebot");
            botLabel.appendChild(username);
            /* const botImg = document.createElement("IMG");
            botImg.setAttribute("src", "icons/bot.png");
            botImg.classList.add('botImg'); */

            /* text = document.createTextNode(currentMessage);
            botMsg.appendChild(text); */
            //console.log("currentMessage: ", currentMessage)
            currentMessage = currentMessage.replace(/(\*{1,3})(.*?)\1/g, "<b>$2</b>");
            currentMessage = currentMessage.replace(/(^|\n)#{1,3}\s+(.*?)($|\n)/g, "$1<b>$2</b>$3"); //modifica *, **, ***, #, ##, ### con il grassetto
            currentMessage = currentMessage.replace(/\n/g, "<br>");
            botMsg.innerHTML = currentMessage; //aggiunge il testo al messaggio
            if (i<=1) botMsgContainer.appendChild(botLabel);
            botMsgContainer.appendChild(botMsg);
            msgContainer.appendChild(botMsgContainer);

            botMsgContainer.scrollIntoView()
            toRead.push(el)
        }
    }
    const typeGif = document.querySelector('.isTyping');
    if (typeGif != null) typeGif.remove(); 
    inputButton.classList.remove('send-disabled');
    justSent = false;
    //readMessage(toRead);
}
function deleteTyping() {
    if(document.querySelector('.isTyping') != null)
    document.querySelector('.isTyping').remove();
}

let tokens_span = document.querySelector("#tokens")
let cost_span = document.querySelector("#cost")
function updateTokens(data){

  let total_tokens = data[0]
  let total_cost = data[1]
  if (total_tokens > -1) tokens_span.innerHTML = total_tokens
  if (total_cost > -1)cost_span.innerHTML = total_cost
}
// ========================= InputButton Change ===================== //
queryText.addEventListener("keydown", (event) =>{
	if (event.keyCode == 13 && queryText.value == ""){
		event.preventDefault()
	}else if (event.keyCode == 13 && queryText.value != "" &&!event.shiftKey){
		event.preventDefault()
		generateUserMsg();
	}
})
queryText.addEventListener("keyup", (event) =>{
    /* if (queryText.value !== ""){
        buttonIcon.src = "icons/send.png"
        inputButton.className = "inputButton send"
    }else{
        buttonIcon.src = "icons/microphone.png"
        inputButton.className = "inputButton speech"
    } */
	
		if (event.keyCode == 13 && !event.shiftKey) generateUserMsg();
	//}
    
});


// ================= Rule description display =================== //

function displayDesc(el) {
  const ruleId = el.getAttribute('ruleid');
  const ruleDesc = document.querySelector(`div[descid='${ruleId}']`);
  const isClosed = ruleDesc.classList.contains('closed');

  if (isClosed) {
    // Apertura
    ruleDesc.style.maxHeight = ruleDesc.scrollHeight + 'px'; // Imposta l'altezza dinamica
    ruleDesc.classList.remove('closed');
    ruleDesc.classList.add('open');

    // Rimuovi maxHeight dopo la transizione per evitare problemi su resize
    ruleDesc.addEventListener('transitionend', function handler() {
      ruleDesc.style.maxHeight = 'none';
      ruleDesc.removeEventListener('transitionend', handler);
    });
  } else {
    // Chiusura
    ruleDesc.style.maxHeight = ruleDesc.scrollHeight + 'px'; // Necessario per calcolare l'altezza corrente
    requestAnimationFrame(() => {
      ruleDesc.style.maxHeight = '0px'; // Riduci l'altezza a 0
    });
    ruleDesc.classList.remove('open');
    ruleDesc.classList.add('closed');
  }
}

function displayProblemDesc(el) {

  const ruleId = el.getAttribute('problemid');
  const ruleDesc = document.querySelector(`div[problemdescid='${ruleId}']`);
  const state = ruleDesc.classList.contains('closed') ? 'closed' : 'open';
  if (state === 'closed') {

    ruleDesc.style.maxHeight = '1000px';
    ruleDesc.style.padding = '1em';
    ruleDesc.classList.remove('closed');
    ruleDesc.classList.add('open');
  } else {
    ruleDesc.style.maxHeight = '0';
    setTimeout(() => {
      ruleDesc.style.padding = '0';
    }, 500);
    ruleDesc.classList.remove('open');
    ruleDesc.classList.add('closed');
  }
}


// ===================== Carousel ======================= //

/*createConflictCard(
  true,
  "Conflitto",
  {
    "id_conflict": "17422966096088_1746629662875",
    "rules": [
      {
        "id": "17422966096088",
        "name": "Accendi aria condizionata quando è caldo",
        "description": "Event: quando è caldo Condition: se piove Action: accendi aria condizionata "
      },
      {
        "id": "1746629662875",
        "name": "Spengi aria condizionata quando è caldo",
        "description": "Event: quando è caldo Condition: se piove Action: spegni aria condizionata "
      }
    ],
    "possibleSolutions": {
      "description": "Questo testo rappresenta una descrizione generale del conflitto e delle possibili soluzioni.",
      "recommendations": {
        "17422966096088": {
          "alternatives": [
            {
              "structured": "Event: Temperature rises above 26°C (sensor.temperatura_salotto_temperature) Condition: Presenza Salotto is ON (binary_sensor.presenza_salotto) Action: Turn ON aria condizionata (fan.aria_condizionata).",
              "natural_language": "When the living room temperature rises above 26°C and someone is present in the living room, turn on the air conditioner."
            }
          ]
        },
        "1746629662875": {
          "alternatives": [
            {
              "structured": "Event: Temperature drops below 24°C (sensor.temperatura_salotto_temperature) Action: Turn OFF aria condizionata (fan.aria_condizionata).",
              "natural_language": "When the living room temperature drops below 24°C, turn off the air conditioner."
            }
          ]
        }
      }
    },
    "type": "possible"
  }
);*/
function printUserProblems(problemsList) {
  for (const [index, problem] of problemsList.entries()){
    if (problems['type'] == 'conflict'){
      createConflictCard(
        index == 0,
        `Conflitto ${problem['id']}`,
        problem
      )
    }
    else if (problems['type'].split('-')[0] == 'chain'){
      createChainCard(
        index == 0,
        `Catena ${problem['id']}`,
        problem
      )
    }else{
      //TODO: aggiungere i problemi di tipo "energy"
      console.log("Nessun problema associato a questo account");
    }
  }   
}

//TODO: aggiungere a conflicts.py il tipo di conflitto (se ha evento uguale senza condizioni, evento uguale con condizioni ecc.)
// stesso evento, no condizioni, azioni diverse --> same_event_no_conditions
// stesso evento, stesse condizioni, azioni diverse --> same_event_same_conditions
// stesso evento, condizioni diverse ma sovrapponibili --> same_event_different_conditions
// diversi eventi, no condizioni, azioni diverse --> different_event_no_conditions
// diversi eventi, condizioni sovrapponibili, azioni diverse --> different_event_with_conditions
function createConflictCard(isActive, headerText, conflictInfo) {
    //isActive = boolean (True dovrebbe essere solo la prima card generata)
    /*conflictInfo = {
    "id_conflict": "17422966096088_1746629662875",
    "rules": [
      {
        "id": "17422966096088",
        "name": "Accendi aria condizionata quando \u00e8 caldo",
        "description": "Event: quando \u00e8 caldo Condition: bla bla condizione Action: Accendi aria condizionata "
      },
      {
        "id": "1746629662875",
        "name": "Spengi aria condizionata quando \u00e8 caldo",
        "description": "Event: bla bla evento condizione Action: bla bla azione "
      }
    ],
    "possibleSolutions": {
      "description": "Questo testo rappresenta una descrizione generale del conflitto e delle possibili soluzioni.",
      "recommendations": {
        "17422966096088": {
          "alternatives": [
            {
              "structured": "Event: Temperature rises above 26\u00b0C (sensor.temperatura_salotto_temperature) Condition: Presenza Salotto is ON (binary_sensor.presenza_salotto) Action: Turn ON aria condizionata (fan.aria_condizionata).",
              "natural_language": "When the living room temperature rises above 26\u00b0C and someone is present in the living room, turn on the air conditioner."
            }
          ]
        },
        "1746629662875": {
          "alternatives": [
            {
              "structured": "Event: Temperature drops below 24\u00b0C (sensor.temperatura_salotto_temperature) Action: Turn OFF aria condizionata (fan.aria_condizionata).",
              "natural_language": "When the living room temperature drops below 24\u00b0C, turn off the air conditioner."
            }
          ]
        }
      }
    },
    "type": "possible"
  }*/
    //recommendations = {"alias_automazione1": ["opzione1", "opzione2"], "alias_automazione2": ["opzione3", "opzione4"]}
    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;
    const svgArrow = () => {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "svg_conflict2"); // Aggiunta classe
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "40");
        svg.setAttribute("viewBox", "0 0 18 40");
        svg.setAttribute("fill", "none"); // Impostato fill a none per l'elemento svg
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M8.75 39.9991L17.5038 25.0535L0.183666 24.9453L8.75 39.9991ZM7.50003 -0.00937502L7.34378 24.9907L10.3437 25.0094L10.5 0.00937502L7.50003 -0.00937502ZM7.34378 24.9907L7.3344 26.49L10.3343 26.5088L10.3437 25.0094L7.34378 24.9907Z");
        path.setAttribute("fill", "#4E63CC"); // Colore del path
        svg.appendChild(path);
        return svg;
    };
    const createConflictArrowSVG = () => {
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "svg_conflict");
      svg.setAttribute("viewBox", "0 0 717 160");
      svg.setAttribute("fill", "none"); // L'attributo fill sull'elemento svg radice è "none"

      const path1 = document.createElementNS(svgNS, "path");
      path1.setAttribute("d", "M21 160L41.2073 125H0.79274L21 160ZM21 75H17.5L17.5 117.5H21H24.5L24.5 75H21ZM21 117.5H17.5V128.5H21H24.5V117.5H21Z");
      path1.setAttribute("fill", "#4E63CC");
      svg.appendChild(path1);

      const path2 = document.createElementNS(svgNS, "path");
      path2.setAttribute("d", "M696 160L716.207 125H675.793L696 160ZM696 75H692.5V117.5H696H699.5V75H696ZM696 117.5H692.5V128.5H696H699.5V117.5H696Z");
      path2.setAttribute("fill", "#4E63CC");
      svg.appendChild(path2);

      const line1 = document.createElementNS(svgNS, "line");
      line1.setAttribute("x1", "17.5");
      line1.setAttribute("y1", "71.579");
      line1.setAttribute("x2", "699.5");
      line1.setAttribute("y2", "71.579");
      line1.setAttribute("stroke", "#4E63CC");
      line1.setAttribute("stroke-width", "7");
      svg.appendChild(line1);

      const line2 = document.createElementNS(svgNS, "line");
      line2.setAttribute("x1", "358.5");
      line2.setAttribute("y1", "70");
      line2.setAttribute("x2", "358.5");
      line2.setAttribute("y2", "-3.45707e-06");
      line2.setAttribute("stroke", "#4E63CC");
      line2.setAttribute("stroke-width", "7");
      svg.appendChild(line2);

      return svg;
  };

    const rule1 = conflictInfo['rules'][0]
    const rule1_id = rule1['id']
    const rule1_name = rule1['name']
    const rule2 = conflictInfo['rules'][1]
    const rule2_id = rule2['id']
    const rule2_name = rule2['name']
    const type_of_conflict = "same_event_no_conditions";

    const temp_mapping = new Map();
    temp_mapping.set(rule1_id, rule1);
    temp_mapping.set(rule2_id, rule2);

    const card = document.createElement("div");
    card.className = "card border-dark carousel__item";
    if (isActive) {
        card.classList.add("active");
    }else {
        card.classList.add("not_active");
    }

    const header = document.createElement("div");
    header.className = "card-header";
    header.textContent = headerText;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "card-body";

    const spanText = document.createElement("span");
    spanText.className = "card-text";
    spanText.textContent = conflictInfo["possibleSolutions"]["description"];
    body.appendChild(spanText);

    const container = document.createElement("div");
    container.className = "container_arrow";

    const rule1_match = rule1['description'].match(regex);
    const rule2_match = rule2['description'].match(regex);

    if (rule1_match && rule1_match.groups && rule2_match && rule2_match.groups) {
        const rule1 = rule1_match.groups;
        const rule2 = rule2_match.groups;
        const p = document.createElement("p");
        p.textContent = rule1.event; //teoricamente dovrebbe essere uguale (almeno semanticamente) a rule2.event
        container.appendChild(p);
        if(type_of_conflict === "same_event_same_conditions") { 
          container.appendChild(svgArrow()); //freccia semplice
          const p2 = document.createElement("p");
          p2.textContent = rule1.condition; //teoricamente dovrebbe essere uguale (almeno semanticamente) a rule2.condition
          container.appendChild(p2);
        }
        container.appendChild(createConflictArrowSVG()); //freccia biforcuta
        const conflict_rappresentation_container = document.createElement("table");
        conflict_rappresentation_container.className = "conflict_rappresentation_container no_mt";
        if(type_of_conflict === "same_event_different_conditions") { 
          //TODO: sistema i nomi dei tr/td
          const tr0 = document.createElement("tr");
          const td_0 = document.createElement("td");
          const td_1 = document.createElement("td");
          const td_2 = document.createElement("td");
          td_0.style.color = "green";
          td_0.innerHTML = `${rule1.condition}`;
          td_2.style.color = "green";
          td_2.innerHTML = `${rule2.condition}`;
          conflict_rappresentation_container.appendChild(tr0);
          tr0.appendChild(td_0);
          tr0.appendChild(td_1);
          tr0.appendChild(td_2);

          const tr01 = document.createElement("tr");
          const td_00 = document.createElement("td");
          const td_01 = document.createElement("td");
          const td_02 = document.createElement("td");
          td_00.appendChild(svgArrow());
          td_02.appendChild(svgArrow());
          conflict_rappresentation_container.appendChild(tr01);
          tr01.appendChild(td_00);
          tr01.appendChild(td_01);
          tr01.appendChild(td_02);
        }
        const tr1 = document.createElement("tr");
        const td1 = document.createElement("td");
        const td2 = document.createElement("td");
        const td3 = document.createElement("td");
        const actionWords1 = (rule1.action).trim().split(/\s+/);
        const firstWord1 = actionWords1[0] || "";
        const restOfPhrase1 = actionWords1.slice(1).join(" ");
        td1.innerHTML =  `<span>${firstWord1}</span> ${restOfPhrase1} </br> <i>${rule1_name}</i>`;
        td2.className = "cell_img_conf";
        td1.style.width = "44%";
        td3.style.width = "44%";
        const img1 = document.createElement("img");
        img1.src = "img/conflict2.png";
        td2.appendChild(img1);
        const actionWords2 = (rule2.action).trim().split(/\s+/);
        const firstWord2 = actionWords2[0] || "";
        const restOfPhrase2 = actionWords2.slice(1).join(" ");
        td3.innerHTML =  `<span>${firstWord2}</span> ${restOfPhrase2} </br> <i>${rule2_name}</i>`;
        conflict_rappresentation_container.appendChild(tr1);
        tr1.appendChild(td1);
        tr1.appendChild(td2);
        tr1.appendChild(td3);
        body.appendChild(conflict_rappresentation_container);
        
        container.appendChild(conflict_rappresentation_container);
    };
    body.appendChild(container);

    const title = document.createElement("p");
    title.className = "card-title";
    title.textContent = "Come posso risolvere?";
    body.appendChild(title);

    const accordion = document.createElement("div");
    accordion.className = "accordion stay-open";
    let index = 0;
    const recommendations = conflictInfo["possibleSolutions"]["recommendations"];
    for (let automationID in recommendations) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("h2");
        header.className = "accordion-header";

        const button = document.createElement("button");
        button.className = "accordion-button";
        button.setAttribute("onclick", "toggleStayOpen(this)");
        button.textContent = `Modifica l'automazione  "${temp_mapping.get(automationID)["name"]}"`;

        header.appendChild(button);
        item.appendChild(header);

        const collapse = document.createElement("div");
        collapse.className = "accordion-collapse";
        if (index === 0) collapse.classList.add("active");

        const body = document.createElement("div");
        body.className = "accordion-body";

        recommendations[automationID]["alternatives"].forEach((alternative, i) => {
            const formCheck = document.createElement("div");
            formCheck.className = "form-check";

            const input = document.createElement("input");
            input.className = "form-check-input";
            input.type = "radio";
            input.name = "radioDefault";
            input.id = `radioDefault${index}-${i}`;

            const label = document.createElement("label");
            label.className = "form-check-label";
            label.setAttribute("for", input.id);
            label.textContent = alternative["natural_language"];

            formCheck.appendChild(input);
            formCheck.appendChild(label);
            body.appendChild(formCheck);
        });

        collapse.appendChild(body);
        item.appendChild(collapse);
        accordion.appendChild(item);
        index++;
    };

    body.appendChild(accordion);
    card.appendChild(body);
    carousel.appendChild(card);
    carousel.click();
    return card;
}

function createChainCard(isActive, headerText, chainInfo) {
    //recommendations = {"alias_automazione1": ["opzione1", "opzione2"], "alias_automazione2": ["opzione3", "opzione4"]}
    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;

    const rule1 = chainInfo['rules'][0]
    const rule1_id = rule1['id']
    const rule1_name = rule1['name']
    const rule2 = chainInfo['rules'][1]
    const rule2_id = rule2['id']
    const rule2_name = rule2['name']
    const type_of_chain = chainInfo["type"].split("-")[0]; //direct, indirect, etc.
    
    const svgArrow = () => {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "40");
        svg.setAttribute("viewBox", "0 0 18 40");
        svg.setAttribute("fill", "none");
        const path = document.createElementNS(svgNS, "path");
        if (type_of_chain === "direct") {
            svg.setAttribute("class", "svg_conflict2");
            path.setAttribute("d", "M8.75 39.9991L17.5038 25.0535L0.183666 24.9453L8.75 39.9991ZM7.50003 -0.00937502L7.34378 24.9907L10.3437 25.0094L10.5 0.00937502L7.50003 -0.00937502ZM7.34378 24.9907L7.3344 26.49L10.3343 26.5088L10.3437 25.0094L7.34378 24.9907Z");
        } else {
            svg.setAttribute("class", "svg_chain");
            path.setAttribute("d", "M9 39.9991L17.7538 25.0535L0.433666 24.9453L9 39.9991ZM7.75003 -0.00937502L7.73701 2.07396L10.7369 2.09271L10.75 0.00937502L7.75003 -0.00937502ZM7.71097 6.24063L7.68492 10.4073L10.6849 10.4261L10.7109 6.25938L7.71097 6.24063ZM7.65888 14.574L7.63284 18.7407L10.6328 18.7594L10.6588 14.5927L7.65888 14.574ZM7.6068 22.9073L7.59378 24.9907L10.5937 25.0094L10.6067 22.9261L7.6068 22.9073ZM7.59378 24.9907L7.58596 26.2406L10.5859 26.2593L10.5937 25.0094L7.59378 24.9907ZM7.57034 28.7404L7.55471 31.2403L10.5547 31.259L10.5703 28.7592L7.57034 28.7404ZM7.53909 33.7401L7.52347 36.24L10.5234 36.2587L10.539 33.7589L7.53909 33.7401ZM9 39.9991L17.7538 25.0535L0.433666 24.9453L9 39.9991ZM7.75003 -0.00937502L7.73701 2.07396L10.7369 2.09271L10.75 0.00937502L7.75003 -0.00937502ZM7.71097 6.24063L7.68492 10.4073L10.6849 10.4261L10.7109 6.25938L7.71097 6.24063ZM7.65888 14.574L7.63284 18.7407L10.6328 18.7594L10.6588 14.5927L7.65888 14.574ZM7.6068 22.9073L7.59378 24.9907L10.5937 25.0094L10.6067 22.9261L7.6068 22.9073ZM7.59378 24.9907L7.58596 26.2406L10.5859 26.2593L10.5937 25.0094L7.59378 24.9907ZM7.57034 28.7404L7.55471 31.2403L10.5547 31.259L10.5703 28.7592L7.57034 28.7404ZM7.53909 33.7401L7.52347 36.24L10.5234 36.2587L10.539 33.7589L7.53909 33.7401Z");
        }
        path.setAttribute("fill", "#4E63CC");
        svg.appendChild(path);
        return svg;
    };

    const temp_mapping = new Map();
    temp_mapping.set(rule1_id, rule1);
    temp_mapping.set(rule2_id, rule2);

    const card = document.createElement("div");
    card.className = "card border-dark carousel__item";
    if (isActive) {
        card.classList.add("active");
    }else {
        card.classList.add("not_active");
    }

    const header = document.createElement("div");
    header.className = "card-header";
    header.textContent = headerText;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "card-body";

    const spanText = document.createElement("span");
    spanText.className = "card-text";
    spanText.textContent = chainInfo["possibleSolutions"]["description"];
    body.appendChild(spanText);

    const container = document.createElement("div");
    container.className = "container_arrow";

    const rule1_match = rule1['description'].match(regex);
    const rule2_match = rule2['description'].match(regex);

    if (rule1_match && rule1_match.groups && rule2_match && rule2_match.groups) {
        const rule1 = rule1_match.groups;
        const rule2 = rule2_match.groups;
        const p = document.createElement("p");
        p.innerHTML = `${rule1.event}${rule1.condition ? " " + rule1.condition : ""}, <b>${rule1.action}</b> </br> <i>${rule1_name}</i>`; //teoricamente dovrebbe essere uguale (almeno semanticamente) a rule2.event
        container.appendChild(p);
       
        const condition_action_container = document.createElement("div");
        condition_action_container.className = "container_action";
        const rule1_anonym_div = document.createElement("div");
        
        rule1_anonym_div.appendChild(svgArrow());

        if(type_of_chain === "indirect") { 
          const chain_variable = chainInfo["chain_variable"]
          const chain_variable_p = document.createElement("p");
          chain_variable_p.className = "chain_variable";
          chain_variable_p.innerHTML = `<i>${chain_variable}</i>`;
          rule1_anonym_div.appendChild(chain_variable_p);
          condition_action_container.appendChild(rule1_anonym_div);

          rule1_anonym_div.appendChild(svgArrow());
        }
        
        const action = document.createElement("p");
        action.innerHTML = `<b>${rule2.event}</b>${rule2.condition ? " " + rule2.condition : ""}, ${rule2.action} </br> <i>${rule2_name}</i>`;
        rule1_anonym_div.appendChild(action);
        condition_action_container.appendChild(rule1_anonym_div);
        
        const rule2_anonym_div = document.createElement("div");

        condition_action_container.appendChild(rule2_anonym_div);
        
        container.appendChild(condition_action_container);
    };
    body.appendChild(container);

    const title = document.createElement("p");
    title.className = "card-title";
    title.textContent = "Come posso risolvere?";
    body.appendChild(title);

    const accordion = document.createElement("div");
    accordion.className = "accordion stay-open";
    let index = 0;
    const recommendations = chainInfo["possibleSolutions"]["recommendations"];
    for (let automationID in recommendations) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("h2");
        header.className = "accordion-header";

        const button = document.createElement("button");
        button.className = "accordion-button";
        button.setAttribute("onclick", "toggleStayOpen(this)");
        button.textContent = `Modifica l'automazione  "${temp_mapping.get(automationID)["name"]}"`;

        header.appendChild(button);
        item.appendChild(header);

        const collapse = document.createElement("div");
        collapse.className = "accordion-collapse";
        if (index === 0) collapse.classList.add("active");

        const body = document.createElement("div");
        body.className = "accordion-body";

        recommendations[automationID]["alternatives"].forEach((alternative, i) => {
            const formCheck = document.createElement("div");
            formCheck.className = "form-check";

            const input = document.createElement("input");
            input.className = "form-check-input";
            input.type = "radio";
            input.name = "radioDefault";
            input.id = `radioDefault${index}-${i}`;

            const label = document.createElement("label");
            label.className = "form-check-label";
            label.setAttribute("for", input.id);
            label.textContent = alternative["natural_language"];

            formCheck.appendChild(input);
            formCheck.appendChild(label);
            body.appendChild(formCheck);
        });

        collapse.appendChild(body);
        item.appendChild(collapse);
        accordion.appendChild(item);
        index++;
    };

    body.appendChild(accordion);
    card.appendChild(body);
    carousel.appendChild(card);
    carousel.click();
    return card;
}

function toggleStayOpen(button) {
  const collapse = button.parentElement.nextElementSibling;
  const isOpen = collapse.classList.contains('show');

  if (isOpen) {
    // chiusura
    collapse.style.maxHeight = collapse.scrollHeight + 'px'; // necessario per animazione fluida
    requestAnimationFrame(() => {
      collapse.style.maxHeight = '0px';
      collapse.classList.remove('show');
      button.classList.remove('active');
    });
  } else {
    // apertura
    collapse.classList.add('show');
    collapse.style.maxHeight = collapse.scrollHeight + 'px';
    button.classList.add('active');

    // rimuovi maxHeight dopo transizione per evitare problemi su resize
    collapse.addEventListener('transitionend', function handler() {
      collapse.style.maxHeight = 'none';
      collapse.removeEventListener('transitionend', handler);
    });
  }
}

function carousel_control_prev() {
  let calculate = pos > 0 ? (pos - 1) % carouselCount : carouselCount;
  if (pos > 0) translateX = pos === 1 ? 0 : translateX - 100;
  else if (pos <= 0) {
    translateX = 100 * (carouselCount - 1);
    calculate = carouselCount - 1;
  }

  pos = slide({
    show: calculate,
    disable: pos,
    translateX: translateX
  });
}

function carousel_control_next() {
  let calculate = (pos + 1) % carouselCount;
  if (pos >= carouselCount - 1) {
    calculate = 0;
    translateX = 0;
  } else {
    translateX += 100;
  }

  pos = slide({
    show: calculate,
    disable: pos,
    translateX: translateX
  });
}

function slide(options) {
  function active(_pos) {
    carouselItems[_pos].classList.toggle("active");
  }

  function inactive(_pos) {
    carouselItems[_pos].classList.toggle("active");
  }

  inactive(options.disable);
  active(options.show);

  document.querySelectorAll(".carousel__item").forEach((item, index) => {
    if (index === options.show) {
      item.classList.remove("not_active");
      item.style.transform = `translateX(-${options.translateX}%) scale(1)`;
    } else {
      item.classList.add("not_active");
      item.style.transform = `translateX(-${options.translateX}%) scale(0.9)`;
    }
  });

  return options.show;
}