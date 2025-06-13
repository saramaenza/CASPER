
//import jwt_decode from "./jwt-decode";
const lang = Cookies.get("lang");
const tokenRaw = Cookies.get("auth-token");
const chat_session_id = Cookies.get("chat_session_id");
const token = jwt_decode(tokenRaw);
const userId = token.id;
//const name = token.name.charAt(0).toUpperCase() + token.name.slice(1);
const userName = token.name;
let isReminderText = false;
let entitiesStates;
let statusInterval = null;
const intervalUpdate = 20000; // Aggiorna lo stato del chatbot ogni 20 secondi

const base_link = window.location.origin;
const getRuleList = `${base_link}/get_rule_list`; // chiamata POST per ricevere la lista delle regole
const getDevices = `${base_link}/get_config`; // chiamata POST per ricevere la lista delle regole
const getEntitiesStates = `${base_link}/get_entities_states`; // chiamata POST per ricevere lo stato delle entità
const sendMessage = `${base_link}/send_message`; // chiamata POST per ricevere la lista delle regole
const changeRule = `${base_link}/changeRule`; // chiamata POST per aggiornare le regole dopo il cancellamento
const getProblemList = `${base_link}/get_problems`; // chiamata GET per ricevere la lista dei problemi
const getGoals = `${base_link}/get_goals`; // chiamata POST per ricevere la lista dei goal
const ping = `${base_link}/post_chat_state`; // chiamata POST per mantere la sessione attiva
const toggleAutomation = `${base_link}/toggle_automation`; // chiamata POST per ricevere la lista delle regole
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
const toggleSwitch = document.getElementById('toggleSwitch');
const toggleBall = document.getElementById('toggleBall');

let carouselObject = null

// Immagine del profilo a pallina
//const userProfile = document.querySelector('#profile');
const initial = document.querySelector('#initial-name');
//const profileInfo = document.querySelector('#profile-info');
const reset = document.querySelector('#reset');

let choosenSolution = null; // {"rule_name": "nome della regola", "rule_id": "id della regola", "solution": "soluzione scelta"}

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
    carouselObject.update(problemsList);
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
  const greeting = document.createElement('h1');
  greeting.textContent = `Ciao, ${userName}`;
  initial.appendChild(greeting);
  await updateChatbotStatus();
  statusInterval = setInterval(async () => {
      await updateChatbotStatus();
  }, intervalUpdate);
  let chatID = document.createElement('div');
  chatID.className = 'chat-id';
  chatID.innerHTML = `Chat ID: ${chat_session_id}`;
  initial.appendChild(chatID);
  let rulesList = await getRulesParam() //GET regole
  //problemList = await getData(`${getProblems}?id=${userId}`) //GET problemi
  let devicesList = await getData(`${getDevices}?id=${userId}`) //GET problemi
  //goalList = await getData(`${getGoals}?id=${userId}`) //GET goal
  
  entitiesStates = await getData(`${getEntitiesStates}?id=${userId}`) 
  // Updates every 60 seconds
  //setInterval(updateEntitiesStates, 60000);

  printUserRule(rulesList); //PRINT regole
  printUserDevices(devicesList); //PRINT devices
  let problemsList = await getProblems()
  printUserProblems(problemsList);
  carouselObject = new Carousel(problemsList)
  //open_delete_rule();

  if (lang == 'en'){
    getBotResponse('hello my dear');
    generateTypingMsg('bot');
  }else{
    //getBotResponse('ciao, chi sei?');
    //generateTypingMsg('bot');
  }

})

async function updateEntitiesStates(){
  entitiesStates = await getData(`${getEntitiesStates}?id=${userId}`)
  let devicesList = await getData(`${getDevices}?id=${userId}`) //GET problemi
  dinamicallyPopulateEntityValue(devicesList['selected']);
}

// Identifica in entitiesStates l'entità corrispondente e restituisce lo stato
function dinamicallyPopulateEntityValue(devices){
  //devices = device['slected']
  const cleanList = formatDeviceList(devices);
  for (let element of Object.entries(cleanList)) {
    let devices = element[1];
    for (let device of devices) {
      const entityId = device[2]; // Nome dell'entità
      const currentEntity = entitiesStates.find(entity => entity.entity_id === entityId);
      document.querySelector(`div[entityid='${entityId}'] .item-value`).textContent = currentEntity.state + (currentEntity.attributes.unit_of_measurement ? currentEntity.attributes.unit_of_measurement : "");
      if (currentEntity.state === "unavailable") {
        document.querySelector(`div[entityid='${entityId}'] .item-indicator`).classList.add('inactive');
      }
    }
  }
}


logoutButton = document.querySelector('#logout');
logoutButton.addEventListener('click', ()=>{
  Cookies.remove('auth-token');
  location.reload();
})
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
    .then(async (data) => {
      resolve(data); // Risolve la promessa con i dati desiderati
      console.log("Delete Automation response: ", data);
      document.querySelector(`div [ruleid='${rule_id}']`).remove();
      let rulesList = await getRulesParam() //GET regole
      printUserRule(rulesList);
      document.querySelector('#n_automations').innerText = rulesList.length;
    })
    .catch(error => {
      console.log(error);
      reject(error); // Reietta la promessa in caso di errore
    });
  });
  
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

  function triggerToggleAutomation(automationId, automationEntityId) {
    return new Promise((resolve, reject) => {
      fetch(toggleAutomation, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "userId": userId,
          "automationEntityId": automationEntityId,
          "automationId": automationId,
        })
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
  document.querySelector('#n_automations').innerText = rules.length;
  const rulesContainer = document.querySelector('#rules-container');
  rulesContainer.innerText = '';

  if (rules.length > 0) {
    
    // Wrapper per tutte le automation-card
    const automationListWrapper = document.createElement('div');
    automationListWrapper.className = 'automation-list-wrapper';
    rulesContainer.appendChild(automationListWrapper);

    // Barra di ricerca
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    const searchBar = document.createElement('input');
    searchBar.type = 'text';
    searchBar.className = 'search-bar';
    searchBar.placeholder = 'Cerca automazioni...';
    const searchIcon = document.createElement('div');
    searchIcon.className = 'search-icon';
    searchIcon.textContent = '🔍';
    searchContainer.appendChild(searchBar);
    searchContainer.appendChild(searchIcon);
    automationListWrapper.appendChild(searchContainer);

    rules.forEach((element, index) => {
      const ruleState = element['state']
      let automationState = ruleState === "on" ? "active": ""; // Stato di default se non specificato
      const automationEntity = element['entity_id']
      element = element['config'];
      
      setTimeout(() => {
        // CARD PRINCIPALE
        const card = document.createElement('div');
        card.className = 'automation-card';
        card.style.transform = 'translateY(0px) scale(1)';
        card.style.display = 'block';
        card.style.animation = '0.3s ease 0s 1 normal none running fadeIn';

        // Status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = ruleState === "on" ? 'status-indicator': 'status-indicator inactive';
        card.appendChild(statusIndicator);

        // CARD HEADER
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';

        // Header left (icon + title/id)
        const headerLeft = document.createElement('div');
        headerLeft.style.display = 'flex';
        headerLeft.style.alignItems = 'center';

        // Icon
        const automationIcon = document.createElement('div');
        const iconInfo = getAutomationIconInfo(element);
        automationIcon.className = `automation-icon ${iconInfo.className}`;
        automationIcon.textContent = iconInfo.icon;

        // Titolo e ID
        const titleIdContainer = document.createElement('div');
        const automationTitle = document.createElement('div');
        automationTitle.className = 'automation-title';
        automationTitle.textContent = element['alias'];

        const automationId = document.createElement('div');
        automationId.className = 'automation-id';
        automationId.textContent = `ID ${element['id']}`;

        titleIdContainer.appendChild(automationTitle);
        titleIdContainer.appendChild(automationId);

        headerLeft.appendChild(automationIcon);
        headerLeft.appendChild(titleIdContainer);

        // Toggle switch
        const toggleSwitch = document.createElement('div');
        toggleSwitch.className = `toggle-switch ${automationState}`; // aggiungi/rimuovi 'active' per stato ON/OFF
        toggleSwitch.setAttribute('entity', automationEntity || "automation." + 
          element['alias']
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Rimuove diacritici/accenti
            .toLowerCase()
            .replace(/°/g, 'deg')
            .replace(/[^a-zA-Z0-9\s]/g, '_')
            .split(' ')
            .join('_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
        );
        toggleSwitch.setAttribute('ruleid', element['id']);
        toggleSwitch.setAttribute('title', 'Accendi/Spegni Automazione');

        const toggleSlider = document.createElement('div');
        toggleSlider.className = 'toggle-slider';
        toggleSwitch.appendChild(toggleSlider);

        // Bottone "Elimina"
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️';
        deleteButton.classList.add('deleteButton');
        deleteButton.setAttribute('ruleid', element['id']);
        deleteButton.setAttribute('title', 'Elimina Automazione');

        // Assembla header
        cardHeader.appendChild(headerLeft);
        cardHeader.appendChild(toggleSwitch);

        // Descrizione
        const automationDescription = document.createElement('div');
        automationDescription.className = 'automation-description';
        automationDescription.textContent = removeHomeAssistantEntities(element['description']) || 'Questa automazione non ha una descrizione';

        // Assembla tutto
        card.appendChild(cardHeader);
        card.appendChild(automationDescription);
        card.appendChild(deleteButton);
        automationListWrapper.appendChild(card);

        // Funzionalità di cancellazione
        deleteButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          const ruleId = deleteButton.getAttribute('ruleid');
          const ruleName = "ID:"+ruleId+" - " +automationTitle.textContent;

          // Crea l'overlay
          const overlay = document.createElement('div');
          overlay.className = 'overlay';

          // Crea il dialog
          const dialog = document.createElement('div');
          dialog.className = 'confirm-dialog';
          dialog.innerHTML = `
              <h3>Conferma eliminazione</h3>
              <p>Sei sicuro di voler eliminare la regola "${ruleName}"?</p>
              <div class="confirm-buttons">
                  <button class="confirm-btn no">No</button>
                  <button class="confirm-btn yes">Si</button>
              </div>
          `;

          overlay.appendChild(dialog);
          document.body.appendChild(overlay);

          // Gestisci i click sui bottoni
          const buttons = dialog.querySelectorAll('.confirm-btn');
          buttons.forEach(button => {
              button.addEventListener('click', async () => {
                  // Aggiungi la classe fadeOut
                  overlay.classList.add('fadeOut');
                  
                  // Rimuovi l'overlay dopo che l'animazione è completata
                  setTimeout(async () => {
                      if (button.classList.contains('yes')) {
                          await deleteAutomation(ruleId);
                          
                          //deleteRule(ruleId, rules);
                      }
                      overlay.remove();
                  }, 200); // Stesso tempo dell'animazione CSS
              });
          });
      });
      }, index * 100);
    });

    // Funzionalità di ricerca
    searchBar.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const cards = automationListWrapper.querySelectorAll('.automation-card');
      cards.forEach(card => {
        const title = card.querySelector('.automation-title')?.textContent.toLowerCase() || "";
        const description = card.querySelector('.automation-description')?.textContent.toLowerCase() || "";
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });

    // Effetto hover sulle card e toggle functionality
    setTimeout(() => {
      automationListWrapper.querySelectorAll('.automation-card').forEach(card => {
        // Hover effect
        card.addEventListener('mouseenter', function() {
          this.style.transform = 'translateX(3px)';
        });
        card.addEventListener('mouseleave', function() {
          this.style.transform = 'translateX(0px)';
        });

        // Toggle functionality
        const toggle = card.querySelector('.toggle-switch');
        const indicator = card.querySelector('.status-indicator');
        // Toggle functionality
        if (toggle) {
          toggle.addEventListener('click', async function () {
            const toggleCall = await triggerToggleAutomation(
              this.getAttribute('ruleid'),
              this.getAttribute('entity')
            )
            if (toggleCall.status === "error") {
              // Crea l'overlay
              const overlay = document.createElement('div');
              overlay.className = 'overlay';

              // Crea il dialog
              const dialog = document.createElement('div');
              dialog.className = 'confirm-dialog';
              dialog.innerHTML = `
                  <h3>Errore</h3>
                  <p>Errore durante il cambio di stato dell'automazione</p>
                  <div class="confirm-buttons">
                      <button class="confirm-btn ok">OK</button>
                  </div>
              `;

              overlay.appendChild(dialog);
              document.body.appendChild(overlay);

              // Gestisci il click sul bottone OK
              const okButton = dialog.querySelector('.ok');
              okButton.addEventListener('click', () => {
                  // Aggiungi la classe fadeOut
                  overlay.classList.add('fadeOut');
                  
                  // Rimuovi l'overlay dopo che l'animazione è completata
                  setTimeout(() => {
                      overlay.remove();
                  }, 200); // Stesso tempo dell'animazione CSS
              });
              
              return;
          }
            const state = toggleCall.state=="on" ? "active" : "";
            if (state === "active") {
              if (!this.classList.contains('active')) {
                this.classList.add('active');
                indicator.classList.remove('inactive');
              }
            }else {
              this.classList.remove('active');
              indicator.classList.add('inactive');
            }
            
          });
        }
      });
    }, rules.length * 100 + 100);

  } else {
    rulesContainer.innerText = 'Nessuna regola associata a questo account';
  }
}

function getAutomationIconInfo(automation) {
    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;
    const rule_match = automation.description.match(regex);
    let groups = {};
    let text = automation.description.toLowerCase();
    if (rule_match) {
      groups = rule_match.groups;
      text = (groups.action).toLowerCase();
    }
    
    if (text.includes("luce") || text.includes("light") || text.includes("lampadina")) {
        return {
            icon: "💡",
            className: "light-icon"
        };
    }
    if (text.includes("temperatura") || text.includes("climate")) {
        return {
            icon: "🌡️",
            className: "schedule-icon"
        };
    }
    if (text.includes("porta") || text.includes("finestra") || text.includes("door") || text.includes("window")) {
        return {
            icon: "🚪",
            className: "corridor-icon"
        };
    }
    if (text.includes("ventilatore") || text.includes("fan") || text.includes("purificatore") || text.includes("air purifier")) {
        return {
            icon: "💨",
            className: "living-icon"
        };
    }
    if(text.includes("aria condizionata") || text.includes("air conditioning") || text.includes("ac")) {
        return {
            icon: "❄️",
            className: "ac-icon"
        };
    }
    if (text.includes("lavatrice") || text.includes("washing machine")) {
        return {
            icon: "🧺",
            className: "washer-icon"
        };
    }
    if (text.includes("lavastoviglie") || text.includes("dishwasher")) {
        return {
            icon: "🍽️",
            className: "dishwasher-icon"
        };
    }
    if (text.includes("asciugatrice") || text.includes("dryer")) {
        return {
            icon: "👕",
            className: "dryer-icon"
        };
    }
    if (text.includes("computer") || text.includes("pc") || text.includes("laptop")) {
        return {
            icon: "💻",
            className: "computer-icon"
        };
    }
    if (text.includes("frigo") || text.includes("frigorifero") || text.includes("refrigerator")) {
        return {
            icon: "🧊",
            className: "fridge-icon"
        };
    }
    if (text.includes("tv") || text.includes("televisione") || text.includes("television")) {
        return {
            icon: "📺",
            className: "tv-icon"
        };
    }
    if (text.includes("termostato") || text.includes("thermostat")) {
        return {
            icon: "🌡️",
            className: "thermostat-icon" 
        };
    }
    if (text.includes("altoparlante") || text.includes("speaker") || text.includes("audio")) {
        return {
            icon: "🔈",
            className: "speaker-icon"
        };
    }
    if (text.includes("telecamera") || text.includes("camera")) {
        return {
            icon: "📹",
            className: "camera-icon"
        };
    }
    if (text.includes("allarme") || text.includes("alarm")) {
      return {
          icon: "🚨",
          className: "alarm-icon"
      };
    }
    if (text.includes("irrigazione") || text.includes("irrigation") || text.includes("sprinkler")) {
        return {
            icon: "💧",
            className: "irrigation-icon"
      };
    }
    if (text.includes("campanello") || text.includes("doorbell")) {
        return {
            icon: "🔔",
            className: "doorbell-icon"
        };
    }
    if (text.includes("cancello") || text.includes("gate")) {
        return {
            icon: "🔐",
            className: "gate-icon"
        };
    }
    if (text.includes("presa") || text.includes("plug") || text.includes("socket")) {
        return {
            icon: "🔌",
            className: "plug-icon"
        };
    }
    // Default
    return {
        icon: "⚡",
        className: "kitchen-icon"
    };
}

async function printUserDevices(devicesList) {
  document.querySelector('#n_devices').innerText = devicesList['selected'].length;
  const devices = devicesList['selected'];
  const devicesContainer = document.querySelector('#devices-list-container');

  const devicesListWrapper = document.createElement('div');
  devicesListWrapper.className = 'devices-list-wrapper';
  devicesContainer.appendChild(devicesListWrapper);
  
  // Barra di ricerca
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  const searchBar = document.createElement('input');
  searchBar.type = 'text';
  searchBar.className = 'search-bar';
  searchBar.placeholder = 'Cerca dispositivi...';
  const searchIcon = document.createElement('div');
  searchIcon.className = 'search-icon';
  searchIcon.textContent = '🔍';
  searchContainer.appendChild(searchBar);
  searchContainer.appendChild(searchIcon);
  devicesListWrapper.appendChild(searchContainer);


  let cleanList = {}
  if (devicesList != true && devices != undefined) { //organizzo per stanze "a", salvo il nome dell entita "f"
    cleanList = formatDeviceList(devices);
  } else { return "Nessun dispositivo associato a questo account"; }

  setTimeout(() => {
  Object.keys(cleanList).forEach((key) => {
    // Crea il contenitore della stanza
    let room = document.createElement('div');
    room.classList.add('room-card');
    
    let roomName = document.createElement('div');
    roomName.classList.add('category-title');

    let categoryIcon = document.createElement('div');
    categoryIcon.classList.add('category-icon');
    categoryIcon.textContent = getIcon(key, 'room');
    categoryIcon.className = "automation-icon room-icon";

    const roomNameText = document.createElement('span');
    roomNameText.classList.add('room-name');
    roomNameText.textContent = ` ${key}`;

    roomName.appendChild(categoryIcon);
    roomName.appendChild(roomNameText);

    // Aggiungi il listener per il clic
    roomName.addEventListener('click', () => {
      roomName.classList.toggle('active');
      const roomNameSpan = roomName.querySelector('.room-name');
      if (roomNameSpan) {
        roomNameSpan.classList.toggle('active');
      }
      const devicesList_container = roomName.nextElementSibling;

      if (devicesList_container && devicesList_container.classList.contains('devicesList_container')) {
        if (devicesList_container.classList.contains('open')) {
          devicesList_container.style.maxHeight = '0';
          devicesList_container.classList.remove('open');
        } else {
          devicesList_container.style.maxHeight = devicesList_container.scrollHeight + 'px';
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
      let deviceText = document.createElement('div');
      let iconElement = document.createElement('i');
      let itemIndicator = document.createElement('div');
      let itemValue = document.createElement('div');
      //let deviceState = dinamciallyPopulateEntityValue(device); // Ottieni lo stato dinamico dell'entità
      
      iconElement.classList.add('bx', device[1]);
      deviceText.classList.add('device-text');
      deviceElement.classList.add('device-element');
      deviceElement.setAttribute('entityid', device[2]); // Aggiungi l'entity id come attributo
      itemIndicator.classList.add('item-indicator'); 
       
      itemValue.classList.add('item-value'); 
      
      //itemValue.innerHTML = deviceState; 

      deviceText.textContent = device[0];
      deviceElement.appendChild(itemIndicator)
      deviceElement.appendChild(iconElement);
      deviceElement.appendChild(deviceText);
      deviceElement.appendChild(itemValue);
      devicesList.appendChild(deviceElement);
    });

    devicesList_container.appendChild(devicesList);
    room.appendChild(devicesList_container);
    devicesListWrapper.appendChild(room);
    });
    // Funzionalità di ricerca
    searchBar.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const rooms = devicesListWrapper.querySelectorAll('.room-card');
      
      rooms.forEach(room => {
        const roomName = room.querySelector('.room-name')?.textContent.toLowerCase() || "";
        const devices = room.querySelectorAll('.device-element');
        let hasVisibleDevices = false;
        
        // Cerca nei dispositivi di questa stanza
        devices.forEach(device => {
          const deviceName = device.querySelector('.device-text')?.textContent.toLowerCase() || "";
          if (deviceName.includes(searchTerm) || roomName.includes(searchTerm)) {
            device.style.display = 'flex';
            hasVisibleDevices = true;
          } else {
            device.style.display = 'none';
          }
        });
        
        // Mostra/nascondi la stanza in base ai dispositivi visibili
        if (hasVisibleDevices || roomName.includes(searchTerm)) {
          room.style.display = 'block';
          room.style.animation = 'fadeIn 0.3s ease';
        } else {
          room.style.display = 'none';
        }
      });
    });
    dinamicallyPopulateEntityValue(devices)
  }, 100);
 
}

function getIcon(name, type) {
    // Convert to lowercase for case-insensitive comparison
    const text = name.toLowerCase();
    // Room specific icons
    if (type === 'room') {
        if (text.includes("cucina") || text.includes("kitchen")) {
            return "🍳";
        }
        if (text.includes("camera") || text.includes("bedroom")) {
            return "🛏️";
        }
        if (text.includes("bagno") || text.includes("bathroom")) {
            return "🚿";
        }
        if (text.includes("salotto") || text.includes("living")) {
            return "🛋️";
        }
        if (text.includes("studio") || text.includes("office") || text.includes("ufficio")) {
            return "💼";
        }
        if (text.includes("garage")) {
            return "🚗";
        }
        if (text.includes("giardino") || text.includes("garden")) {
            return "🌳";
        }
        if (text.includes("corridoio") || text.includes("hallway")) {
            return "🚪";
        }
        if (text.includes("cantina") || text.includes("cellar")) {
            return "🍷";
        }
        if (text.includes("fuori") || text.includes("outside")) {
            return "☀️";
        }
        return "🏠"; // Default room icon
    }

    // Variable specific icons
    if (type === 'variable') {
        if (text.includes('temperatura') || text.includes('temperature') || text.includes('climate')) {
            return '🌡️';
        }
        if (text.includes('umidità') || text.includes('humidity')) {
            return '💧';
        }
        if (text.includes('luminosità') || text.includes('brightness') || text.includes('illuminance')) {
            return '☀️';
        }
        if (text.includes('movimento') || text.includes('motion')) {
            return '🏃';
        }
        if (text.includes('presenza') || text.includes('presence')) {
            return '👤';
        }
        if (text.includes("rumore") || text.includes("sound_pressure")){
          return '🔊';
        }
        if (text.includes("aqi") || text.includes("qualità dell'aria") || (text.includes("air quality index"))){
          return '🌫️';
        }
        if (text.includes("energy") || text.includes("energia")){
          return '⚡';
        }
        return '📊'; // Default variable icon
    }
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
    document.querySelector(`div [ruleid='${id}']`).remove();
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
    let username = document.createTextNode("Casper");
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
  icon.classList.add('bx', 'bxs-analyze', 'bx-spin');
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
    box.classList.remove('bxs-analyze', 'bx-spin');
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
    box.classList.remove('bxs-analyze', 'bx-spin');
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
  let username = document.createTextNode("Casper");
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
            let username = document.createTextNode("Casper");
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


function printUserProblems(problemsList) {
  const carouselControls = document.getElementById('carousel-controls');
  const carouselMessages = document.getElementById('carousel-messages');
  
  if (!problemsList || problemsList.length === 0) {
      // Nascondi i controlli e mostra il messaggio
      carouselControls.style.display = 'none';
      carouselMessages.innerHTML = `
          <div class="no-problems-message">
              Non sono presenti problemi nella tua smart home 😊
              <br>
              <span class="no-problems-submessage">Se hai bisogno di aiuto, chiedi a Casper!</span>
          </div>
      `;
  } else {
    // Mostra i controlli e nascondi il messaggio
      carousel.innerHTML = ''; // Pulisce il contenuto del carousel
      carouselControls.style.display = 'flex';
      carouselMessages.innerHTML = '';
      carouselMessages.style.display = 'none';
      document.querySelector('#n_problems').innerText = problemsList.length || 0;
      for (const [index, problem] of problemsList.entries()){
        if (problem['type'] == 'conflict'){
          createConflictCard(
            index == 0,
            `Conflitto ${problem['id']}`,
            problem
          )
        }
        else if (problem['type'].split('-')[1] == 'chain'){
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
}

function createChainCard(isActive, headerText, chainInfo) {
    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;

    const rule1 = chainInfo['rules'][0];
    const rule1_id = rule1['id'];
    const rule1_name = rule1['name'];
    const rule2 = chainInfo['rules'][1];
    const rule2_id = rule2['id'];
    const rule2_name = rule2['name'];

    const rule1_match = rule1['description'].match(regex);
    const rule2_match = rule2['description'].match(regex);

    // Early return if invalid format
    if (!rule1_match?.groups || !rule2_match?.groups) {
        console.warn('Invalid rule format detected');
        return null;
    }

    // CARD
    const card = document.createElement("div");
    card.className = "card";

    // CARD CONTAINER
    const cardContainer = document.createElement("div");
    cardContainer.className = "card-container";

    // CARD HEADER
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header";

    // Problem icon
    const problemIcon = document.createElement("div");
    problemIcon.className = "problem-icon";
    problemIcon.textContent = "⚠️";

    // Problem content
    const problemContent = document.createElement("div");
    problemContent.className = "problem-content";

    const problemTitle = document.createElement("div");
    problemTitle.className = "problem-title";
    problemTitle.textContent = headerText || "Catena tra automazioni";

    const problemId = document.createElement("div");
    problemId.className = "problem-id";
    problemId.textContent = `Problema ID: ${chainInfo["unique_id"] || ""}`;

    problemContent.appendChild(problemTitle);
    problemContent.appendChild(problemId);
    cardHeader.appendChild(problemIcon);
    cardHeader.appendChild(problemContent);

    // CARD BODY
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";

    // Description
    const spanText = document.createElement("span");
    spanText.className = "card-text";
    spanText.textContent = chainInfo["possibleSolutions"]["description"];
    cardBody.appendChild(spanText);

    // CONFLICT DIAGRAM
    const conflictDiagram = document.createElement("div");
    conflictDiagram.className = "conflict-diagram";

    // Create automation flow container
    const automationFlow = document.createElement("div");
    automationFlow.className = "automation-flow";

    // First automation card
    const firstAutomation = document.createElement("div");
    firstAutomation.className = "automation-chain-card";

    // Icon for first automation
    const firstIcon = document.createElement("div");
    const firstIconInfo = getAutomationIconInfo({"description": rule1_match.groups.action});
    firstIcon.className = `card-icon ${firstIconInfo.className}`;
    firstIcon.textContent = firstIconInfo.icon;

    // Title and subtitle for first automation
    const firstTitle = document.createElement("div");
    firstTitle.className = "card-chain-title";
    firstTitle.textContent = `${rule1_match.groups.event}${rule1_match.groups.condition ? `, ${rule1_match.groups.condition}` : ''}, ${rule1_match.groups.action}`;

    const firstSubtitle = document.createElement("div");
    firstSubtitle.className = "card-chain-subtitle";
    firstSubtitle.textContent = rule1_name;

    // Assemble first automation card
    firstAutomation.appendChild(firstIcon);
    firstAutomation.appendChild(firstTitle);
    firstAutomation.appendChild(firstSubtitle);

    // First arrow
    const firstArrow = document.createElement("div");
    firstArrow.className = "flow-arrow";
    firstArrow.textContent = "→";

    // Variable card (created outside if statement)
    const variableCard = document.createElement("div");
    variableCard.className = "variable-chain-card";

    // Second arrow (created outside if statement)
    const secondArrow = document.createElement("div");
    secondArrow.className = "flow-arrow";
    secondArrow.textContent = "→";

    // Second automation card
    const secondAutomation = document.createElement("div");
    secondAutomation.className = "automation-chain-card";

    // Icon for second automation
    const secondIcon = document.createElement("div");
    const secondIconInfo = getAutomationIconInfo({"description": rule2_match.groups.action});
    secondIcon.className = `card-icon ${secondIconInfo.className}`;
    secondIcon.textContent = secondIconInfo.icon;

    // Title and subtitle for second automation
    const secondTitle = document.createElement("div");
    secondTitle.className = "card-chain-title";
    secondTitle.textContent = `${rule2_match.groups.event}${rule2_match.groups.condition ? `, ${rule2_match.groups.condition}` : ''}, ${rule2_match.groups.action}`;

    const secondSubtitle = document.createElement("div");
    secondSubtitle.className = "card-chain-subtitle";
    secondSubtitle.textContent = rule2_name;

    // Populate variable card if indirect chain
    if(chainInfo.type == "indirect-chain") {
        const variableTranslations = {
          'temperature': 'temperatura',
          'humidity': 'umidità',
          'illuminance': 'illuminazione',
          'sound_pressure': 'rumore',
          'aqi': 'qualità aria',
          'energy': 'energia'
        };
        const variableIcon = document.createElement("div");
        variableIcon.className = "card-icon";
        variableIcon.textContent = getIcon(chainInfo.chain_variable, 'variable');

        const variableName = document.createElement("div");
        variableName.className = "card-chain-variable";
        // Aggiungi una freccia in base al tipo di effetto
        const symbol = chainInfo.effect_type === "increase" ? "<span class='plus'>+</span>" : "<span class='minus'>-</span>";
        const translatedVariable = variableTranslations[chainInfo.chain_variable] || chainInfo.chain_variable;
        variableName.innerHTML = `${symbol} ${translatedVariable}`;

        variableCard.appendChild(variableIcon);
        variableCard.appendChild(variableName);
    }

    // Assemble second automation card
    secondAutomation.appendChild(secondIcon);
    secondAutomation.appendChild(secondTitle);
    secondAutomation.appendChild(secondSubtitle);

    // Assemble the flow
    automationFlow.appendChild(firstAutomation);
    automationFlow.appendChild(firstArrow);
    
    // Only append variable card and second arrow for indirect chains
    if(chainInfo.type == "indirect-chain") {
        automationFlow.appendChild(variableCard);
        automationFlow.appendChild(secondArrow);
    }
    
    automationFlow.appendChild(secondAutomation);

    // Add to diagram
    conflictDiagram.appendChild(automationFlow);
    cardBody.appendChild(conflictDiagram);

    // SOLUTIONS TITLE
    const title = document.createElement("p");
    title.className = "card-title";
    title.textContent = "Come posso risolvere?";
    cardBody.appendChild(title);

    // ACCORDION
    const accordion = document.createElement("div");
    accordion.className = "accordion stay-open";
    
    const recommendations = chainInfo["possibleSolutions"]["recommendations"];
    for (let automationID in recommendations) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("h2");
        header.className = "accordion-header";

        const button = document.createElement("button");
        button.className = "accordion-button";
        button.setAttribute("onclick", "toggleStayOpen(this)");
        button.textContent = `Modifica l'automazione "${automationID === rule1_id ? rule1_name : rule2_name}"`;

        header.appendChild(button);
        item.appendChild(header);

        const collapse = document.createElement("div");
        collapse.className = "accordion-collapse";

        const body = document.createElement("div");
        body.className = "accordion-body";

        recommendations[automationID]["alternatives"].forEach((alternative, i) => {
            const formCheck = document.createElement("div");
            formCheck.className = "form-check";

            const input = document.createElement("input");
            input.className = "form-check-input";
            input.type = "radio";
            input.name = `radio-${automationID}`;
            input.id = `radio-${automationID}-${i}`;

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
    }
    cardBody.appendChild(accordion);

    // ACTION BUTTONS
    const actionButtons = document.createElement("div");
    actionButtons.className = "action-buttons";

    const ignoreButton = document.createElement("button");
    ignoreButton.className = "btn btn-ignore";
    ignoreButton.textContent = "Ignora";
    ignoreButton.id = chainInfo["id_chain"];

    const solveButton = document.createElement("button");
    solveButton.className = "btn btn-resolve";
    solveButton.textContent = "Risolvi";
    solveButton.id = chainInfo["id_chain"];

    actionButtons.appendChild(ignoreButton);
    actionButtons.appendChild(solveButton);
    cardBody.appendChild(actionButtons);

    // ASSEMBLE EVERYTHING
    cardContainer.appendChild(cardHeader);
    cardContainer.appendChild(cardBody);
    card.appendChild(cardContainer);
    carousel.appendChild(card);
    carousel.click();

    return card;
}

// stesso evento, no condizioni, azioni diverse --> same_event_no_conditions
// stesso evento, stesse condizioni, azioni diverse --> same_event_same_conditions
// stesso evento, condizioni diverse ma sovrapponibili --> same_event_different_conditions
// diversi eventi, no condizioni, azioni diverse --> different_event_no_conditions
// diversi eventi, condizioni diverse ma sovrapponibili, azioni diverse --> different_event_different_conditions
// diversi eventi, stesse condizioni, azioni diverse --> different_event_same_conditions
function createConflictCard(isActive, headerText, conflictInfo) {

    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;

    // Estrai le informazioni delle regole
    const rule_1 = conflictInfo['rules'][0];
    const rule1_id = rule_1['id'];
    const rule1_name = rule_1['name'];
    const rule1_description = removeHomeAssistantEntities(rule_1['description'])
    const rule_2 = conflictInfo['rules'][1];
    const rule2_id = rule_2['id'];
    const rule2_name = rule_2['name'];
    const rule2_description = removeHomeAssistantEntities(rule_2['description'])

    const rule1_match = rule1_description.match(regex);
    const rule2_match = rule2_description.match(regex);

    const temp_mapping = new Map();
    temp_mapping.set(rule1_id, rule_1);
    temp_mapping.set(rule2_id, rule_2);

    type_of_conflict = conflictInfo['tag'];

    if (!rule1_match?.groups || !rule2_match?.groups) {
        console.warn('Invalid rule format detected');
        return null;
    }

    const rule1 = rule1_match.groups;
    const rule2 = rule2_match.groups;

    // CARD
    const card = document.createElement("div");
    card.className = "card";

    // CARD CONTAINER
    const cardContainer = document.createElement("div");
    cardContainer.className = "card-container";

    // CARD HEADER
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header";

    // Problem icon
    const problemIcon = document.createElement("div");
    problemIcon.className = "problem-icon";
    problemIcon.textContent = "⚠️";

    // Problem content 
    const problemContent = document.createElement("div");
    problemContent.className = "problem-content";

    const problemTitle = document.createElement("div");
    problemTitle.className = "problem-title";
    problemTitle.textContent = headerText || "Conflitto tra automazioni";

    const problemId = document.createElement("div");
    problemId.className = "problem-id";
    problemId.textContent = `Problema ID: ${conflictInfo["id"] || ""}`;

    problemContent.appendChild(problemTitle);
    problemContent.appendChild(problemId);
    cardHeader.appendChild(problemIcon);
    cardHeader.appendChild(problemContent);

    // CARD BODY
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";

    // Descrizione conflitto
    const spanText = document.createElement("span");
    spanText.className = "card-text";
    spanText.textContent = conflictInfo["possibleSolutions"]["description"];
    cardBody.appendChild(spanText);

    // CONFLICT DIAGRAM
    const conflictDiagram = document.createElement("div");
    conflictDiagram.className = "conflict-diagram";

    // TABELLA CONFLITTO
    const conflictTable = document.createElement("table");
    conflictTable.className = "conflict_rappresentation_containers";
    conflictTable.style.width = "100%";
    conflictTable.style.borderCollapse = "collapse";
    conflictTable.style.tableLayout = "fixed";

 

    if(type_of_conflict.includes("same_event")){
        // Titolo diagramma
        const diagramTitle = document.createElement("div");
        diagramTitle.className = "diagram-title";
        let eventText = "";
        if (rule1_match.groups && rule1_match.groups.event) {
            eventText = rule1_match.groups.event.trim().replace(/\.$/, '');
        }
        diagramTitle.textContent = eventText ? eventText : "Evento in comune:";
        conflictDiagram.appendChild(diagramTitle);
        
        if(type_of_conflict === "same_event_same_conditions") { 
            const conditionBox1 = document.createElement("div");
            conditionBox1.className = "same-condition-box";
            let condition1 = `${rule1.condition}` || "";
            conditionBox1.textContent = `${condition1}`;
            conflictDiagram.appendChild(conditionBox1);
        }

        if(type_of_conflict === "same_event_different_conditions") { 
            const row_condition = document.createElement("tr");
            
            // Condition boxes
            for(let i = 0; i < 3; i++) {
                const td = document.createElement("td");
                if(i === 0) {
                    const conditionBox1 = document.createElement("div");
                    conditionBox1.className = "condition-box";
                    conditionBox1.textContent = rule1.condition || "Nessuna Condizione";
                    td.appendChild(conditionBox1);
                } else if(i === 2) {
                    const conditionBox2 = document.createElement("div");
                    conditionBox2.className = "condition-box";
                    conditionBox2.textContent = rule2.condition || "Nessuna Condizione";
                    td.appendChild(conditionBox2);
                }
                row_condition.appendChild(td);
            }
            conflictTable.appendChild(row_condition);
        }
    } else {
        // RIGA EVENTI
        const row_events = document.createElement("tr");
        
        // Celle eventi
        for(let i = 0; i < 3; i++) {
            const td = document.createElement("td");
            if(i === 0) {
                td.innerHTML = `<div class="box-event">${rule1.event}</div>`;
            } else if(i === 2) {
                td.innerHTML = `<div class="box-event">${rule2.event}</div>`;
            }
            row_events.appendChild(td);
        }
        conflictTable.appendChild(row_events);

        if(type_of_conflict === "different_event_different_conditions" || 
           type_of_conflict === "different_event_same_conditions") {
            const row_condition = document.createElement("tr");
            
            // Celle condizioni
            for(let i = 0; i < 3; i++) {
                const td = document.createElement("td");
                if(i === 0) {
                    const conditionBox1 = document.createElement("div");
                    conditionBox1.className = "condition-box";
                    conditionBox1.innerHTML = `${rule1.condition}` || "";
                    td.appendChild(conditionBox1);
                } else if(i === 2) {
                    const conditionBox2 = document.createElement("div");
                    conditionBox2.className = "condition-box";
                    conditionBox2.innerHTML = `${rule2.condition}` || "";
                    td.appendChild(conditionBox2);
                }
                row_condition.appendChild(td);
            }
            conflictTable.appendChild(row_condition);
        }
    }

    // RIGA AZIONI
    const row_action = document.createElement("tr");
    
    // Celle azioni
    for(let i = 0; i < 3; i++) {
        const td = document.createElement("td");
        if(i === 0) {
            const actionBox1 = document.createElement("div");
            actionBox1.className = "action-box";
            actionBox1.innerHTML = rule1_match.groups.action?.trim().replace(/\.$/, '') || "";
            td.appendChild(actionBox1);
        } else if(i === 1) {
            const conflictIcon = document.createElement("div");
            conflictIcon.className = "conflict-icon";
            conflictIcon.textContent = "💥";
            td.appendChild(conflictIcon);
        } else {
            const actionBox2 = document.createElement("div");
            actionBox2.className = "action-box";
            actionBox2.innerHTML = rule2_match.groups.action?.trim().replace(/\.$/, '') || "";
            td.appendChild(actionBox2);
        }
        row_action.appendChild(td);
    }
    conflictTable.appendChild(row_action);

    // RIGA NOMI AUTOMAZIONI
    const row_names = document.createElement("tr");
    for(let i = 0; i < 3; i++) {
        const td = document.createElement("td");
        if(i === 0) {
            td.innerHTML = `<i>${rule1_name}</i>`;
        } else if(i === 2) {
            td.innerHTML = `<i>${rule2_name}</i>`;
        }
        row_names.appendChild(td);
    }
    conflictTable.appendChild(row_names);
    
    // Assembla il diagramma
    conflictDiagram.appendChild(conflictTable);
    cardBody.appendChild(conflictDiagram);

    // TITOLO SOLUZIONI
    const title = document.createElement("p");
    title.className = "card-title";
    title.textContent = "Come posso risolvere?";
    cardBody.appendChild(title);

    // ACCORDION
    const accordion = document.createElement("div");
    accordion.className = "accordion stay-open";
    let index = 0;
    
    // Aggiungi le raccomandazioni
    const recommendations = conflictInfo["possibleSolutions"]["recommendations"];
    for (let automationID in recommendations) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("h2");
        header.className = "accordion-header";

        const button = document.createElement("button");
        button.className = "accordion-button";
        button.setAttribute("onclick", "toggleStayOpen(this)");
        button.textContent = `Modifica l'automazione "${temp_mapping.get(automationID)["name"]}"`;

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
    }
    cardBody.appendChild(accordion);

    // ACTION BUTTONS
    const actionButtons = document.createElement("div");
    actionButtons.className = "action-buttons";

    const ignoreButton = document.createElement("button");
    ignoreButton.className = "btn btn-ignore";
    ignoreButton.textContent = "Ignora";
    ignoreButton.id = conflictInfo["id_conflict"];

    const solveButton = document.createElement("button");
    solveButton.className = "btn btn-resolve";
    solveButton.textContent = "Risolvi";
    solveButton.id = conflictInfo["id_conflict"];

    actionButtons.appendChild(ignoreButton);
    actionButtons.appendChild(solveButton);
    cardBody.appendChild(actionButtons);

    // ASSEMBLA TUTTO
    cardContainer.appendChild(cardHeader);
    cardContainer.appendChild(cardBody);
    card.appendChild(cardContainer);
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

// ===================== Carousel Control ======================= //
class Carousel {
  constructor(problemsList = null) {
      this.track = document.getElementById('carouselTrack');
      this.prevBtn = document.getElementById('prevBtn');
      this.nextBtn = document.getElementById('nextBtn');
      
      this.currentSlide = 0;
      this.totalSlides = 0;

      this.setupEventListeners();
      this.init(problemsList);
  }

  async init(problemsList) {
      try {
          //let problemsList = await getProblems();
          this.totalSlides = problemsList.length;
          this.updateDisplay();
          this.updateButtons();
      } catch (error) {
          console.error('Error initializing carousel:', error);
          this.totalSlides = 0;
      }
  }

  update(problemsList) {
      try {
          //let problemsList = await getProblems();
          this.totalSlides = problemsList.length;
          this.updateDisplay();
          this.updateButtons();
      } catch (error) {
          console.error('Error initializing carousel:', error);
          this.totalSlides = 0;
      }
    }
  

  setupEventListeners() {
      this.prevBtn.addEventListener('click', () => this.prevSlide());
      this.nextBtn.addEventListener('click', () => this.nextSlide());
      
      // Touch/swipe support
      let startX = 0;
      let currentX = 0;
      let isDragging = false;
      
      this.track.addEventListener('touchstart', (e) => {
          startX = e.touches[0].clientX;
          isDragging = true;
      });
      
      this.track.addEventListener('touchmove', (e) => {
          if (!isDragging) return;
          currentX = e.touches[0].clientX;
      });
      
      this.track.addEventListener('touchend', () => {
          if (!isDragging) return;
          
          const diffX = startX - currentX;
          if (Math.abs(diffX) > 50) {
              if (diffX > 0) {
                  this.nextSlide();
              } else {
                  this.prevSlide();
              }
          }
          
          isDragging = false;
      });
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') this.prevSlide();
          if (e.key === 'ArrowRight') this.nextSlide();
      });
  }
  
  nextSlide() {
      if (this.currentSlide < this.totalSlides - 1) {
          this.currentSlide++;
      } else {
          this.currentSlide = 0; // Loop back to start
      }
      this.updateDisplay();
  }
  
  prevSlide() {
      if (this.currentSlide > 0) {
          this.currentSlide--;
      } else {
          this.currentSlide = this.totalSlides - 1; // Loop to end
      }
      this.updateDisplay();
  }
  
  goToSlide(index) {
      this.currentSlide = index;
      this.updateDisplay();
  }
  
  updateDisplay() {
      const translateX = -this.currentSlide * 100;
      this.track.style.transform = `translateX(${translateX}%)`;
  }

  updateButtons() {
      if (this.totalSlides <= 1) {
          this.prevBtn.style.display = 'none';
          this.nextBtn.style.display = 'none';
          return;
      }

      this.prevBtn.style.display = 'block';
      this.nextBtn.style.display = 'block';

      if (this.currentSlide === 0) {
          this.prevBtn.classList.add('disabled');
      } else {
          this.prevBtn.classList.remove('disabled');
      }

      if (this.currentSlide === this.totalSlides - 1) {
          this.nextBtn.classList.add('disabled');
      } else {
          this.nextBtn.classList.remove('disabled');
      }
  }

}


// Send button functionality
document.querySelector('.inputButton').addEventListener('click', function() {
    const input = document.querySelector('.inputButton');
    if (input.value.trim()) {
        // Animazione più fluida
        this.style.transition = 'transform 0.2s ease-in-out';
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
            input.value = '';
        }, 200);
    }
});

// ===================== Remove entity ids ======================= //

// Funzione per rimuovere gli entity ID dalle stringhe
function removeHomeAssistantEntities(text) {
  const homeAssistantEntityRegex = /\s*\([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z0-9_.-]+[^)]*\)/g;
  return text.replace(homeAssistantEntityRegex, '');
}



// ===================== Device List ======================= //

function formatDeviceList(devices){
  //si aspetta in input device['selected']
  let icon = domainMap['default'];
  let cleanList = {};
  if (devices != undefined) { //organizzo per stanze "a", salvo il nome dell entita "f"
    devices.forEach(element => {
      const deviceClass = element['dc'] || null;
      const deviceDomain = element['t'] || null;
      icon = classMap[deviceClass] || domainMap[deviceDomain] || domainMap['default'];
      if (cleanList.hasOwnProperty(element['a'])) {
        cleanList[element['a']].push([element['f'], icon, element['e']]); //aggiungi entity id
      }else {
        cleanList[element['a']] = [[element['f'], icon, element['e']]]; //aggiungi entity id
      }
    });
    return cleanList;
  }
}


// Gestisce il click sul toggle tema
toggleSwitch.addEventListener('click', function() {
    //body.classList.toggle('dark');
    toggleSwitch.classList.toggle('dark');
    toggleBall.classList.toggle('dark');
});

// Aggiunge effetto hover con il mouse
toggleSwitch.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
});

toggleSwitch.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
});

// Funzione per impostare il tema
function setTheme(isDark = false) {
    const root = document.documentElement;
    const toggleSwitch = document.getElementById('toggleSwitch');
    const toggleBall = document.getElementById('toggleBall');
    
    if (isDark) {
        root.removeAttribute('data-theme');
        toggleSwitch.classList.add('dark');
        toggleBall.classList.add('dark');
    } else {
        root.setAttribute('data-theme', 'light');
        toggleSwitch.classList.remove('dark');
        toggleBall.classList.remove('dark');
    }
}

// Funzione per rilevare il tema di sistema e impostare il tema dell'app
function setSystemTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    function updateTheme(e) {
        const isDark = e.matches;
        setTheme(isDark);
    }
    
    // Imposta il tema iniziale in base alle preferenze di sistema
    updateTheme(prefersDark);
    
    // Ascolta i cambiamenti del tema di sistema
    prefersDark.addEventListener('change', updateTheme);
}


// Inizializza quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Imposta il tema iniziale basato sulle preferenze di sistema
    setSystemTheme();
    
    // Mantieni la funzionalità del toggle manuale
    document.getElementById('toggleSwitch').addEventListener('click', function() {
        const root = document.documentElement;
        const isDark = root.getAttribute('data-theme') === 'light';
        setTheme(isDark);
    });
/*
    createChainCard(
  true,
  "Catena 5564",
  {
    "unique_id": "17422966096088_1746629662875",
    "rules": [
      {
        "id": "17422966096088",
        "name": "Accendi aria condizionata quando è caldo",
        "description": "Event: quando è caldo Condition: se piove Action: accendi aria condizionata "
      },
      {
        "id": "1746629662875",
        "name": "Spengi aria condizionata quando è caldo",
        "description": "Event: quando sono le 9 Condition: se sono le 09:00 Action: spegni aria condizionata "
      }
    ],
    "possibleSolutions": {
      "description": "Questo testo rappresenta una descrizione generale della catena e delle possibili soluzioni.",
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
    "type": "indirect-chain",
    "chain_variable": "humidity"
  }
);*/

});

async function updateChatbotStatus() {
   try {
        let status = document.querySelector('.agent-status');
        let indicator = document.querySelector('.status-indicator-chat');
        const response = await fetch('/chatbot_status', {
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        
        const oldStatus = status.textContent;
        let chatbotStatus = data.status;
        
        // Aggiorna UI solo se lo stato cambia
        if (oldStatus !== chatbotStatus) {
            status.textContent = chatbotStatus;
            if (chatbotStatus === 'Online') {
                indicator.classList.remove('inactive');
            } else {
                indicator.classList.add('inactive');
            }
        }
        
        return chatbotStatus;
    } catch (error) {
        console.log('Status check failed:', error);
        return 'unknown';
    }
}


document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (statusInterval){
      clearInterval(statusInterval);
      statusInterval = null;
    }
  } else {
    // Page became visible!
    statusInterval = setInterval(async () => {
        await updateChatbotStatus();
    }, intervalUpdate);
    
  }
});

/*
const closeLeft = document.querySelector('.close-left-panel');
const leftPanelCover = document.querySelector('.left-container-cover');
const chatbotDiv = document.querySelector('#chat');
const leftPanel = document.querySelector('#left-container');
//const leftPanelInner = document.querySelector('#left-container-inner');
closeLeft.addEventListener('click', () => {
    leftPanel.style.width = '5%';
    leftPanel.style.display = 'inline';
    leftPanelCover.style.height = '100vh';
    leftPanelCover.style.display = 'flex';
    chatbotDiv.style.width = '95%';
});

const chatPanelCover = document.querySelector('.chat-container-cover');
const chatPanelInner = document.querySelector('#chat-container-inner');

leftPanelCover.addEventListener('click', () => {
    leftPanelInner.style.display = 'inital';
    leftPanel.style.width = '95%';
    leftPanelCover.style.display = 'none';
    chatbotDiv.style.width = '5%';
    chatPanelCover.style.display = 'flex';
    chatPanelInner.style.display = 'none';
    chatPanelCover.style.height = '100vh';
})
    */