
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

const base_link = window.location.origin;
const getRuleList = `${base_link}/get_rule_list`; // chiamata POST per ricevere la lista delle regole
const getDevices = `${base_link}/get_config`; // chiamata POST per ricevere la lista delle regole
const getEntitiesStates = `${base_link}/get_entities_states`; // chiamata POST per ricevere lo stato delle entità
const sendMessage = `${base_link}/send_message`; // chiamata POST per ricevere la lista delle regole
const changeRule = `${base_link}/changeRule`; // chiamata POST per aggiornare le regole dopo il cancellamento
const getProblemList = `${base_link}/get_problems`; // chiamata GET per ricevere la lista dei problemi
const getGoals = `${base_link}/get_goals`; // chiamata POST per ricevere la lista dei goal
const ping = `${base_link}/get_chat_state`; // chiamata POST per ricevere la lista dei goal
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

  let chatID = document.createElement('div');
  chatID.className = 'chat-id';
  chatID.innerHTML = `Chat ID: ${chat_session_id}`;
  initial.appendChild(chatID);
  let rulesList = await getRulesParam() //GET regole
  //problemList = await getData(`${getProblems}?id=${userId}`) //GET problemi
  let devicesList = await getData(`${getDevices}?id=${userId}`) //GET problemi
  //goalList = await getData(`${getGoals}?id=${userId}`) //GET goal
  document.querySelector('#n_automations').innerText = rulesList.length;  // First call
  entitiesStates = await getData(`${getEntitiesStates}?id=${userId}`) 
  // Updates every 60 seconds
  //setInterval(updateEntitiesStates, 60000);

  printUserRule(rulesList); //PRINT regole
  document.querySelector('#n_devices').innerText = devicesList['selected'].length;
  printUserDevices(devicesList); //PRINT devices
  let problemsList = await getProblems()
  document.querySelector('#n_problems').innerText = problemsList.length || 0;
  printUserProblems(problemsList);
  
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
      let automationState = element['state'] === "on" ? "active": ""; // Stato di default se non specificato
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
        statusIndicator.className = 'status-indicator';
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
        toggleSwitch.setAttribute('entity', element['alias'].toLowerCase().split(' ').join('_'));
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
        automationDescription.textContent = element['description'] || 'Questa automazione non ha una descrizione';

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
              alert(`Errore durante il cambio di stato dell'automazione`);
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
    
    if (text.includes("movimento") || text.includes("motion")) {
        return {
            icon: "🏃",
            className: "motion-icon"
        };
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
    if (text.includes("ventilatore") || text.includes("fan")) {
        return {
            icon: "💨",
            className: "living-icon"
        };
    }
    if (text.includes("pioggia") || text.includes("rain") || text.includes("weather")) {
        return {
            icon: "🌧️",
            className: "bathroom-icon"
        };
    }
    if(text.includes("aria condizionata") || text.includes("air conditioning") || text.includes("ac")) {
        return {
            icon: "❄️",
            className: "ac-icon"
        };
    }
    // Default
    return {
        icon: "⚡",
        className: "kitchen-icon"
    };
}

async function printUserDevices(devicesList) {
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
    categoryIcon.textContent = getCategoryIcon(key);
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

function getCategoryIcon(roomName) {
  const name = roomName.toLowerCase();
  
  if (name.includes("cucina") || name.includes("kitchen")) {
      return "🍳";
  }
  if (name.includes("camera") || name.includes("bedroom")) {
      return "🛏️";
  }
  if (name.includes("bagno") || name.includes("bathroom")) {
      return "🚿";
  }
  if (name.includes("salotto") || name.includes("living")) {
      return "🛋️";
  }
  if (name.includes("studio") || name.includes("office")) {
      return "💼";
  }
  if (name.includes("garage")) {
      return "🚗";
  }
  if (name.includes("giardino") || name.includes("garden")) {
      return "🌳";
  }
  if (name.includes("corridoio") || name.includes("hallway")) {
      return "🚪";
  }
  if (name.includes("cantina") || name.includes("cellar")) {
      return "🍷";
  }
  if (name.includes("fuori") || name.includes("outside")) {
    return "☀️";
  }
  // Icona di default per altre stanze
  return "🏠";
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
/*
createConflictCard(
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
        "description": "Event: quando sono le 9 Condition: se sono le 09:00 Action: spegni aria condizionata "
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
    if (problem['type'] == 'conflict'){
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

// stesso evento, no condizioni, azioni diverse --> same_event_no_conditions
// stesso evento, stesse condizioni, azioni diverse --> same_event_same_conditions
// stesso evento, condizioni diverse ma sovrapponibili --> same_event_different_conditions
// diversi eventi, no condizioni, azioni diverse --> different_event_no_conditions
// diversi eventi, condizioni diverse ma sovrapponibili, azioni diverse --> different_event_different_conditions
// diversi eventi, stesse condizioni, azioni diverse --> different_event_same_conditions
function createConflictCard(isActive, headerText, conflictInfo) {
    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;
    const entityIDRegex = /\s*\([a-zA-Z_]+\.[a-zA-Z0-9_]+\)/g;

    const rule1 = conflictInfo['rules'][0];
    const rule1_id = rule1['id'];
    const rule1_name = rule1['name'];
    const rule1_description = rule1['description'].replace(entityIDRegex, '');
    const rule2 = conflictInfo['rules'][1];
    const rule2_id = rule2['id'];
    const rule2_name = rule2['name'];
    const rule2_description = rule2['description'].replace(entityIDRegex, '');

    const rule1_match = rule1_description.match(regex);
    const rule2_match = rule2_description.match(regex);

    type_of_conflict = "same_event_different_conditions";

    if (rule1_match && rule1_match.groups && rule2_match && rule2_match.groups) {
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
    problemId.textContent = `CONFLITTO ${conflictInfo["id_conflict"] || ""}`;

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

    const rule1Match = rule1_description.match(regex);

    // TABELLA CONFLITTO
    const conflictTable = document.createElement("table");
    conflictTable.className = "conflict_rappresentation_containers";
    conflictTable.style.width = "100%";
    conflictTable.style.borderCollapse = "collapse";

    if(type_of_conflict.includes("same_event")){
      // Titolo diagramma
      const diagramTitle = document.createElement("div");
      diagramTitle.className = "diagram-title";
      // Mostra l'evento in comune (es: "quando il forno viene spento")

      let eventText = "";
      if (rule1Match && rule1Match.groups && rule1Match.groups.event) {
          eventText = rule1Match.groups.event.trim();
      }
      diagramTitle.textContent = eventText ? eventText + "" : "Evento in comune:";
      conflictDiagram.appendChild(diagramTitle);
      
      if(type_of_conflict === "same_event_same_conditions") { 
        // RIGA CONDIZIONI
        const conditionBox1 = document.createElement("div");
        conditionBox1.className = "same-condition-box";
        let condition1 = `${rule1.condition}`;
        conditionBox1.innerHTML = `${condition1}`;
        conflictDiagram.appendChild(conditionBox1);
      }

      if(type_of_conflict === "same_event_different_conditions") { 
        // RIGA CONDIZIONI
        const row_condition = document.createElement("tr");

        // Condition box 1
        const td1_condition = document.createElement("td");
        const conditionBox1 = document.createElement("div");
        conditionBox1.className = "condition-box";
        let condition1 = `${rule1.condition}`;
        conditionBox1.innerHTML = `${condition1}`;
        td1_condition.appendChild(conditionBox1);

        const td2_condition = document.createElement("td");

        // Condition box 2
        const td3_condition = document.createElement("td");
        const conditionBox2 = document.createElement("div");
        conditionBox2.className = "condition-box";
        let condition2 = `${rule2.condition}`;
        conditionBox2.innerHTML = `${condition2}`;
        td3_condition.appendChild(conditionBox2);

        row_condition.appendChild(td1_condition);
        row_condition.appendChild(td2_condition);
        row_condition.appendChild(td3_condition);
        conflictTable.appendChild(row_condition);
      }
    }

    // RIGA AZIONI
    const row_action = document.createElement("tr");

    // Action box 1
    const td1_action = document.createElement("td");
    const actionBox1 = document.createElement("div");
    actionBox1.className = "action-box";
    let action1 = "";
    let action1Small = "";
    if (rule1Match && rule1Match.groups && rule1Match.groups.action) {
        action1 = rule1Match.groups.action.trim();
        action1Small = rule1_name;
    }
    actionBox1.innerHTML = `${action1}<br><small>${action1Small}</small>`;
    td1_action.appendChild(actionBox1);

    // Conflict icon
    const td2_action = document.createElement("td");
    const conflictIcon = document.createElement("div");
    conflictIcon.className = "conflict-icon";
    conflictIcon.textContent = "⚡";
    td2_action.appendChild(conflictIcon);

    // Action box 2
    const td3_action = document.createElement("td");
    const rule2Match = rule2_description.match(regex);
    const actionBox2 = document.createElement("div");
    actionBox2.className = "action-box";
    let action2 = "";
    let action2Small = "";
    if (rule2Match && rule2Match.groups && rule2Match.groups.action) {
        action2 = rule2Match.groups.action.trim();
        action2Small = rule2_name;
    }
    actionBox2.innerHTML = `${action2}<br><small>${action2Small}</small>`;
    td3_action.appendChild(actionBox2);

    row_action.appendChild(td1_action);
    row_action.appendChild(td2_action);
    row_action.appendChild(td3_action);
    conflictTable.appendChild(row_action);

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
    const recommendations = conflictInfo["possibleSolutions"]["recommendations"];
    for (let automationID in recommendations) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("h2");
        header.className = "accordion-header";

        const button = document.createElement("button");
        button.className = "accordion-button";
        button.setAttribute("onclick", "toggleStayOpen(this)");
        button.textContent = `Modifica l'automazione "${automationID}"`;

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
/*
function createConflictCard(isActive, headerText, conflictInfo) {
    const regex = /^event(?:s|o|i)?:\s*(?<event>.*?)(?:\s*(?:condition(?:s)?|condizion(?:e|i)):\s*(?<condition>.*?))?\s*(?:action(?:s)?|azion(?:i|e)):\s*(?<action>.*)$/i;
    const entityIDRegex = /\s*\([a-zA-Z_]+\.[a-zA-Z0-9_]+\)/g;
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
    const rule1_description = rule1['description'].replace(entityIDRegex, ''); //rimuovo gli entityID
    const rule2 = conflictInfo['rules'][1]
    const rule2_id = rule2['id']
    const rule2_name = rule2['name']
    const rule2_description = rule2['description'].replace(entityIDRegex, '');

    const type_of_conflict = conflictInfo['tag'];

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

    const ignoreButton = document.createElement("button");
    ignoreButton.textContent = "Ignora";
    ignoreButton.setAttribute("problemid", conflictInfo["id"]);
    ignoreButton.className = "ignore-button";
    ignoreButton.addEventListener("click", (e) => {
      console.log("Ignora button clicked for problem ID:", e.target.getAttribute("problemid"));
    });

    const solveButton = document.createElement("button");
    solveButton.textContent = "Risolvi";
    solveButton.setAttribute("problemid", conflictInfo["id"]);
    solveButton.className = "solve-button";
    solveButton.addEventListener("click", (e) => {
      if (choosenSolution != null) {
        let problemId = e.target.getAttribute("problemid");
        let ruleId = choosenSolution.rule_id;
        let ruleName = choosenSolution.rule_name;
        let structured = choosenSolution.solution;
        const message = `<solve_problem>The user want to solve the problem with ID:${problemId} by modifing the automation '${ruleName}'(Automation ID:${ruleId}) in the following way: ${structured}</solve_problem>`;
        getBotResponse(message);
      }
    });

    const rule1_match = rule1_description.match(regex);
    const rule2_match = rule2_description.match(regex);

    if (rule1_match && rule1_match.groups && rule2_match && rule2_match.groups) {
        const rule1 = rule1_match.groups;
        const rule2 = rule2_match.groups;

        const conflict_rappresentation_container = document.createElement("table");
        conflict_rappresentation_container.className = "conflict_rappresentation_container no_mt";

        //costruzione del grafico per conflitti tra automazioni con lo stesso evento
        if (type_of_conflict.includes("same_event")) {
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

          if(type_of_conflict === "same_event_different_conditions") { 
            //riga condizioni
            const conditionRow = document.createElement("tr");
            const leftConditionCell = document.createElement("td");
            const centerConditionCell = document.createElement("td");
            const rightConditionCell = document.createElement("td");
            leftConditionCell.style.color = "green";
            leftConditionCell.textContent = `${rule1.condition}`;
            rightConditionCell.style.color = "green";
            rightConditionCell.textContent = `${rule2.condition}`;
            conflict_rappresentation_container.appendChild(conditionRow);
            conditionRow.appendChild(leftConditionCell);
            conditionRow.appendChild(centerConditionCell);
            conditionRow.appendChild(rightConditionCell);

            //riga freccia
            const arrowRow = document.createElement("tr");
            const leftArrowCell = document.createElement("td");
            const centerArrowCell = document.createElement("td");
            const rightArrowCell = document.createElement("td");
            leftArrowCell.appendChild(svgArrow());
            rightArrowCell.appendChild(svgArrow());
            conflict_rappresentation_container.appendChild(arrowRow);
            arrowRow.appendChild(leftArrowCell);
            arrowRow.appendChild(centerArrowCell);
            arrowRow.appendChild(rightArrowCell);
          }
        } 
        //costruzione del grafico per conflitti tra automazioni con eventi diversi
        else {
          //riga evento
          const eventRow = document.createElement("tr");
          const leftEventCell = document.createElement("td");
          const centerEventCell = document.createElement("td");
          const rightEventCell = document.createElement("td");
          leftEventCell.innerHTML = `${rule1.event}`;
          rightEventCell.innerHTML = `${rule2.event}`;
          conflict_rappresentation_container.appendChild(eventRow);
          eventRow.appendChild(leftEventCell);
          eventRow.appendChild(centerEventCell);
          eventRow.appendChild(rightEventCell);

          //riga freccia
          const arrowRow = document.createElement("tr");
          const leftArrowCell = document.createElement("td");
          const centerArrowCell = document.createElement("td");
          const rightArrowCell = document.createElement("td");
          leftArrowCell.appendChild(svgArrow());
          rightArrowCell.appendChild(svgArrow());
          conflict_rappresentation_container.appendChild(arrowRow);
          arrowRow.appendChild(leftArrowCell);
          arrowRow.appendChild(centerArrowCell);
          arrowRow.appendChild(rightArrowCell);

          //costruzione sezione condizioni
          if(type_of_conflict === "different_event_different_conditions" || type_of_conflict === "different_event_same_conditions") {
            //riga condizioni
            const conditionRow = document.createElement("tr");
            const leftConditionCell = document.createElement("td");
            const centerConditionCell = document.createElement("td");
            const rightConditionCell = document.createElement("td");
            leftConditionCell.innerHTML = `${rule1.condition}`;
            rightConditionCell.innerHTML = `${rule2.condition}`;
            conflict_rappresentation_container.appendChild(conditionRow);
            conditionRow.appendChild(leftConditionCell);
            conditionRow.appendChild(centerConditionCell);
            conditionRow.appendChild(rightConditionCell);

            //riga freccia
            const arrowRow = document.createElement("tr");
            const leftArrowCell = document.createElement("td");
            const centerArrowCell = document.createElement("td");
            const rightArrowCell = document.createElement("td");
            leftArrowCell.appendChild(svgArrow());
            rightArrowCell.appendChild(svgArrow());
            conflict_rappresentation_container.appendChild(arrowRow);
            arrowRow.appendChild(leftArrowCell);
            arrowRow.appendChild(centerArrowCell);
            arrowRow.appendChild(rightArrowCell);
          }
        }
        container.appendChild(conflict_rappresentation_container);
        //riga azioni
        const actionRow = document.createElement("tr");
        const leftActionCell = document.createElement("td");
        const centerImageCell = document.createElement("td");
        const rightActionCell = document.createElement("td");

        const actionWordsRule1 = (rule1.action).trim().split(/\s+/);
        const actionVerbRule1 = actionWordsRule1[0] || "";
        const actionRestRule1 = actionWordsRule1.slice(1).join(" ");
        leftActionCell.innerHTML =  `<span>${actionVerbRule1}</span> ${actionRestRule1} </br> <span class="automation_name">${rule1_name}</span>`;
        leftActionCell.style.width = "44%";
        rightActionCell.style.width = "44%";
        
        centerImageCell.className = "cell_img_conf";
        const conflictImage = document.createElement("img");
        conflictImage.src = "img/conflict2.png";
        centerImageCell.appendChild(conflictImage);

        const actionWordsRule2 = (rule2.action).trim().split(/\s+/);
        const actionVerbRule2 = actionWordsRule2[0] || "";
        const actionRestRule2 = actionWordsRule2.slice(1).join(" ");
        rightActionCell.innerHTML =  `<span>${actionVerbRule2}</span> ${actionRestRule2} </br> <span class="automation_name">${rule2_name}</span>`;
        
        conflict_rappresentation_container.appendChild(actionRow);
        actionRow.appendChild(leftActionCell);
        actionRow.appendChild(centerImageCell);
        actionRow.appendChild(rightActionCell);

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

            input.addEventListener("change", () => {
                if (input.checked) {
                  choosenSolution = {
                    "rule_id": automationID,
                    "rule_name": temp_mapping.get(automationID)["name"],
                    "solution": alternative["structured"],
                  }
                } else {
                  choosenSolution = null;
                }
            });


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
    body.appendChild(ignoreButton);
    body.appendChild(solveButton);
    card.appendChild(body);
    carousel.appendChild(card);
    carousel.click();
    return card;
}
*/

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
  }

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

// ===================== Carousel Control ======================= //
class Carousel {
  constructor() {
      this.track = document.getElementById('carouselTrack');
      this.prevBtn = document.getElementById('prevBtn');
      this.nextBtn = document.getElementById('nextBtn');
      
      this.currentSlide = 0;
      this.totalSlides = 2; // Numero totale di slide, da aggiornare dinamicamente 
      
      this.setupEventListeners();
      this.updateDisplay();
  
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

}
        
// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Carousel();
});

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
});