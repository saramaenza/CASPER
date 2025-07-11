//import jwt_decode from "./jwt-decode";
const lang = Cookies.get("lang");
const tokenRaw = Cookies.get("auth-token");
let chat_session_id = Cookies.get("chat_session_id");
const token = jwt_decode(tokenRaw);
const userId = token.id;
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
const getProblemList = `${base_link}/get_problems`; // chiamata GET per ricevere la lista dei problemi
const getProblemGoalList = `${base_link}/get_problems_goal`; // chiamata GET per ricevere la lista dei problemi legati ai goal
const ping = `${base_link}/post_chat_state`; // chiamata POST per mantere la sessione attiva
const toggleAutomation = `${base_link}/toggle_automation`; // chiamata per accendere/spegnere un'automazione
const ignoreProblem = `${base_link}/ignore_problem`; // chiamata per ignorare un problema
const resetConversationUrl = `${base_link}/reset_conv`; // chiamata per resettare la conversazione

const carousel = document.querySelector(".carousel");
const toggleSwitch = document.getElementById('toggleSwitch');
const toggleBall = document.getElementById('toggleBall');
let carouselObject = null
const initial = document.querySelector('#initial-name');
const sse = new EventSource("/sse");

let choosenSolution = null;

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
    problemsList = problemsList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
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
const goalAdvContainer = document.querySelector('#goal-adv-container');
const preferencesContainer = document.querySelector('#preferences-container');

document.getElementById('show-rules').addEventListener('click', function() {
  if (this.classList.contains('selector-selected')) return;
  else {
    this.classList.remove('selector-unselected'); 
    this.classList.add('selector-selected'); 
    document.getElementById('show-devices').classList.remove('selector-selected');
    document.getElementById('show-devices').classList.add('selector-unselected');
    document.getElementById('show-problems').classList.remove('selector-selected');
    document.getElementById('show-problems').classList.add('selector-unselected');
    document.getElementById('show-goal-adv').classList.remove('selector-selected');
    document.getElementById('show-goal-adv').classList.add('selector-unselected');
    document.getElementById('show-preferences').classList.remove('selector-selected');
    document.getElementById('show-preferences').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-unselected');
  rulesContainer.classList.add('leftbar-selected');
  devicesContainer.classList.remove('leftbar-selected');
  devicesContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.remove('leftbar-selected');
  problemsContainer.classList.add('leftbar-unselected');
  goalAdvContainer.classList.remove('leftbar-selected');
  goalAdvContainer.classList.add('leftbar-unselected');
  preferencesContainer.classList.remove('leftbar-selected');
  preferencesContainer.classList.add('leftbar-unselected');
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
    document.getElementById('show-goal-adv').classList.remove('selector-selected');
    document.getElementById('show-goal-adv').classList.add('selector-unselected');
    document.getElementById('show-preferences').classList.remove('selector-selected');
    document.getElementById('show-preferences').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-selected');
  rulesContainer.classList.add('leftbar-unselected');
  devicesContainer.classList.remove('leftbar-unselected');
  devicesContainer.classList.add('leftbar-selected');
  problemsContainer.classList.remove('leftbar-selected');
  problemsContainer.classList.add('leftbar-unselected');
  goalAdvContainer.classList.remove('leftbar-selected');
  goalAdvContainer.classList.add('leftbar-unselected');
  preferencesContainer.classList.remove('leftbar-selected');
  preferencesContainer.classList.add('leftbar-unselected');
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
    document.getElementById('show-goal-adv').classList.remove('selector-selected');
    document.getElementById('show-goal-adv').classList.add('selector-unselected');
    document.getElementById('show-preferences').classList.remove('selector-selected');
    document.getElementById('show-preferences').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-selected');
  rulesContainer.classList.add('leftbar-unselected');
  devicesContainer.classList.remove('leftbar-selected');
  devicesContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.remove('leftbar-unselected');
  problemsContainer.classList.add('leftbar-selected');
  goalAdvContainer.classList.remove('leftbar-selected');
  goalAdvContainer.classList.add('leftbar-unselected');
  preferencesContainer.classList.remove('leftbar-selected');
  preferencesContainer.classList.add('leftbar-unselected');
});

document.getElementById('show-goal-adv').addEventListener('click', function() {
  if(this.classList.contains('selector-selected')) return;
  else {
    this.classList.remove('selector-unselected'); 
    this.classList.add('selector-selected'); 
    document.getElementById('show-devices').classList.remove('selector-selected');
    document.getElementById('show-devices').classList.add('selector-unselected');
    document.getElementById('show-rules').classList.remove('selector-selected');
    document.getElementById('show-rules').classList.add('selector-unselected');
    document.getElementById('show-problems').classList.remove('selector-selected');
    document.getElementById('show-problems').classList.add('selector-unselected');
    document.getElementById('show-preferences').classList.remove('selector-selected');
    document.getElementById('show-preferences').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-selected');
  rulesContainer.classList.add('leftbar-unselected');
  devicesContainer.classList.remove('leftbar-selected');
  devicesContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.remove('leftbar-selected');
  preferencesContainer.classList.remove('leftbar-selected');
  preferencesContainer.classList.add('leftbar-unselected');
  goalAdvContainer.classList.add('leftbar-selected');
  goalAdvContainer.classList.remove('leftbar-unselected');
});

document.getElementById('show-preferences').addEventListener('click', function() {
  if(this.classList.contains('selector-selected')) return;
  else {
    this.classList.remove('selector-unselected'); 
    this.classList.add('selector-selected'); 
    document.getElementById('show-devices').classList.remove('selector-selected');
    document.getElementById('show-devices').classList.add('selector-unselected');
    document.getElementById('show-rules').classList.remove('selector-selected');
    document.getElementById('show-rules').classList.add('selector-unselected');
    document.getElementById('show-problems').classList.remove('selector-selected');
    document.getElementById('show-problems').classList.add('selector-unselected');
    document.getElementById('show-goal-adv').classList.remove('selector-selected');
    document.getElementById('show-goal-adv').classList.add('selector-unselected');
  }
  rulesContainer.classList.remove('leftbar-selected');
  rulesContainer.classList.add('leftbar-unselected');
  devicesContainer.classList.remove('leftbar-selected');
  devicesContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.add('leftbar-unselected');
  problemsContainer.classList.remove('leftbar-selected');
  goalAdvContainer.classList.add('leftbar-selected');
  goalAdvContainer.classList.add('leftbar-unselected');
  preferencesContainer.classList.add('leftbar-selected');
  preferencesContainer.classList.remove('leftbar-unselected');
});

let rulesList;
window.addEventListener('load', async ()=>{
  // Show initial loader
  devicesContainer.innerHTML = `
      <div class="loader-container">
          <div class="loader"></div>
      </div>
  `;
  rulesContainer.innerHTML = `
      <div class="loader-container">
          <div class="loader"></div>
      </div>
  `;
  problemsContainer.querySelector('.loader-container').style.display = 'flex';
  const greeting = document.createElement('h1');
  greeting.textContent = `Ciao, ${userName}`;
  initial.appendChild(greeting);
  await updateChatbotStatus();
  statusInterval = setInterval(async () => {
      await updateChatbotStatus();
  }, intervalUpdate);
  let chatID = document.createElement('div');
  chatID.className = 'chat-id';
  chatID.textContent = `Chat ID: ${chat_session_id}`;
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
  let problemGoalList = await getProblemGoal()
  problemsList = problemsList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
  problemGoalList = problemGoalList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
  printUserProblems(problemsList);
  carouselObject = new Carousel(problemsList)
  printUserGoalProblems(problemGoalList);
  //open_delete_rule();
  printUserPreferences();
  if (lang == 'en'){
    getBotResponse('hello my dear');
    generateTypingMsg('bot');
  }else{
    //getBotResponse('ciao, chi sei?');
    //generateTypingMsg('bot');
  }

})

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
      let problemsList = await getProblems()  //GET problemi
      problemsList = problemsList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
      let problemsGoalList = await getProblemGoal()
      problemsGoalList = problemsGoalList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
      printUserRule(rulesList);
      document.querySelector('#n_problems').innerText = problemsList.length;
      document.querySelector('#n_goal_advisor').innerText = problemsGoalList.length;
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

  function getProblemGoal() {
      return new Promise((resolve, reject) => {
        fetch(getProblemGoalList, {
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

  if (rules.length > 0) {
    // Wrapper per tutte le automation-card
    const automationListWrapper = document.createElement('div');
    automationListWrapper.className = 'automation-list-wrapper';
    rulesContainer.innerHTML = '';
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
          generateDialog("confirm", "Conferma eliminazione", `Sei sicuro di voler eliminare la regola "${ruleName}"?`, async () => { await deleteAutomation(ruleId); });
          
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
        const toggleSlider = card.querySelector('.toggle-slider');
        const indicator = card.querySelector('.status-indicator');
        // Toggle functionality
        if (toggle) {
          let tmp_toggle = toggleSlider.innerHTML;
          toggle.addEventListener('click', async function () {
          
            toggleSlider.innerHTML=  `
                <div class="loader-container">
                    <div class="loader mini-loader"></div>
                </div>
            `;
          
          let toggleCall = await triggerToggleAutomation(
            this.getAttribute('ruleid'),
            this.getAttribute('entity')
          )
          if (toggleCall.status === "error") {
            generateDialog("info", "Errore", "Errore durante il cambio di stato dell'automazione", () => {});
            toggleSlider.innerHTML = tmp_toggle;
            return;
          }

          let state = toggleCall.state=="on" ? "active" : "";
          toggleSlider.innerHTML = tmp_toggle;
          if (state === "active") {
            if (!this.classList.contains('active')) {
              this.classList.add('active');
              indicator.classList.remove('inactive');
            }
          }else {
            this.classList.remove('active');
            indicator.classList.add('inactive');
          }

          await new Promise(resolve => setTimeout(resolve, 500));

          const problemList = await getProblems()
          let filteredProblems = problemList.filter(problem => !problem.ignore && !problem.solved && problem.state == "on");
          //document.querySelector('#n_problems').innerText = filteredProblems.length;
          printUserProblems(filteredProblems);
          carouselObject.update(filteredProblems);
          });
        }
      });
    }, rules.length * 100 + 100);

  } else {
    rulesContainer.innerHTML = `
        <div class="no-problems-message">
          Inizia a rendere la tua casa intelligente <br> creando la tua prima automazione con Casper! 😊
          <div class="no-problems-submessage">
              Prova a dire <i>"Ciao Casper, vorrei creare una nuova automazione"</i>
          </div>
        </div>
    `; 
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
    if (text.includes("temperatura") || text.includes("climate") || text.includes("riscaldamento") || text.includes("heating") || text.includes("calore") || text.includes("heat") || text.includes("stufetta") || text.includes("stufa")) {
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
            className: "air-icon"
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
    if (text.includes("forno") || text.includes("oven") || text.includes("stove")) {
        return {
            icon: "🔥",
            className: "oven-icon"
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
    document.querySelector('#n_devices').innerText = devicesList['selected'].length;
    const devices = devicesList['selected'];
    const devicesContainer = document.querySelector('#devices-list-container');
    
    if (devicesList != true && devices != undefined) {
        const devicesListWrapper = document.createElement('div');
        devicesListWrapper.className = 'devices-list-wrapper';
        
        // Add search bar only if there are devices
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

        // Clean and organize devices list
        let cleanList = formatDeviceList(devices);

        // Remove loader and show content
        devicesContainer.innerHTML = '';
        devicesContainer.appendChild(devicesListWrapper);
        devicesListWrapper.appendChild(searchContainer);

        // Create and populate device cards
        await new Promise(resolve => {
            setTimeout(() => {
                Object.keys(cleanList).forEach((key) => {
                    // Room container
                    let room = document.createElement('div');
                    room.classList.add('room-card');
                    
                    // Room header
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

                    // Room click handler
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

                    // Devices container
                    let devicesList_container = document.createElement('div');
                    devicesList_container.classList.add('devicesList_container');

                    // Devices list
                    let devicesList = document.createElement('div');
                    devicesList.classList.add('devices-list');

                    // Add devices
                    cleanList[key].forEach((device) => {
                        let deviceElement = document.createElement('div');
                        let deviceText = document.createElement('div');
                        let iconElement = document.createElement('i');
                        let itemIndicator = document.createElement('div');
                        let itemValue = document.createElement('div');
                        
                        iconElement.classList.add('bx', device[1]);
                        deviceText.classList.add('device-text');
                        deviceElement.classList.add('device-element');
                        deviceElement.setAttribute('entityid', device[2]);
                        itemIndicator.classList.add('item-indicator');
                        itemValue.classList.add('item-value');
                        
                        deviceText.textContent = device[0];
                        deviceElement.appendChild(itemIndicator);
                        deviceElement.appendChild(iconElement);
                        deviceElement.appendChild(deviceText);
                        deviceElement.appendChild(itemValue);
                        devicesList.appendChild(deviceElement);
                    });

                    devicesList_container.appendChild(devicesList);
                    room.appendChild(devicesList_container);
                    devicesListWrapper.appendChild(room);
                });

                // Search functionality
                if (searchBar) {
                    searchBar.addEventListener('input', function() {
                        const searchTerm = this.value.toLowerCase();
                        const rooms = devicesListWrapper.querySelectorAll('.room-card');
                        
                        rooms.forEach(room => {
                            const roomName = room.querySelector('.room-name')?.textContent.toLowerCase() || "";
                            const devices = room.querySelectorAll('.device-element');
                            let hasVisibleDevices = false;
                            
                            devices.forEach(device => {
                                const deviceName = device.querySelector('.device-text')?.textContent.toLowerCase() || "";
                                if (deviceName.includes(searchTerm) || roomName.includes(searchTerm)) {
                                    device.style.display = 'flex';
                                    hasVisibleDevices = true;
                                } else {
                                    device.style.display = 'none';
                                }
                            });
                            
                            if (hasVisibleDevices || roomName.includes(searchTerm)) {
                                room.style.display = 'block';
                                room.style.animation = 'fadeIn 0.3s ease';
                            } else {
                                room.style.display = 'none';
                            }
                        });
                    });
                }

                dinamicallyPopulateEntityValue(devices);
                resolve();
            }, 100);
        });

    } else {
        devicesContainer.innerHTML = `
            <div class="no-problems-message">
              Non hai ancora collegato dispositivi smart alla tua casa. <br> 
              Connetti il tuo primo dispositivo per iniziare! 😊
            </div>
        `; 
    }
}


function printUserPreferences() {
    // Pulisce il container
    preferencesContainer.innerHTML = '';

    // Container principale
    const container_preferences = document.createElement('div');  
    container_preferences.id = 'preferences';

    // Container 
    const container = document.createElement('div');
    container.className = 'container_preferences';

    // Header
    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'I Miei Obiettivi';

    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Trascina per riordinare la tua classifica personale';

    header.appendChild(title);
    header.appendChild(subtitle);

    // Lista ranking
    const rankingList = document.createElement('ul');
    rankingList.className = 'ranking-list';
    rankingList.id = 'rankingList';

    // Dati degli obiettivi
    const goals = [
        { id: 'sicurezza', name: 'Sicurezza', icon: '🛡️' },
        { id: 'salute', name: 'Salute', icon: '❤️' },
        { id: 'risparmio', name: 'Risparmio Energetico', icon: '🔋' },
        { id: 'benessere', name: 'Benessere', icon: '🌱' }
    ];

    // Crea gli elementi della lista
    goals.forEach((goal, index) => {
        const goalItem = document.createElement('li');
        goalItem.className = 'goal-item';
        goalItem.draggable = true;
        goalItem.setAttribute('data-goal', goal.id);

        // Numero ranking
        const rankNumber = document.createElement('div');
        rankNumber.className = 'rank-number';
        rankNumber.textContent = index + 1;

        // Contenuto obiettivo
        const goalContent = document.createElement('div');
        goalContent.className = 'goal-content';

        const goalIcon = document.createElement('div');
        goalIcon.className = `goal-icon ${goal.id}`;
        goalIcon.textContent = goal.icon;

        const goalName = document.createElement('span');
        goalName.className = 'goal-name';
        goalName.textContent = goal.name;

        goalContent.appendChild(goalIcon);
        goalContent.appendChild(goalName);

        // Handle per il drag
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '⋮⋮';

        // Assembla l'elemento
        goalItem.appendChild(rankNumber);
        goalItem.appendChild(goalContent);
        goalItem.appendChild(dragHandle);

        rankingList.appendChild(goalItem);
    });

    // Assembla tutto
    container_preferences.appendChild(container);
    container.appendChild(header);
    container.appendChild(rankingList);
    preferencesContainer.appendChild(container_preferences);

    // Aggiunge la funzionalità di drag and drop
    initializeDragAndDropForPreferences();
}

// Funzione specifica per inizializzare il drag and drop delle preferenze
function initializeDragAndDropForPreferences() {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) return; // Sicurezza: esce se l'elemento non esiste
    
    let draggedElement = null;
    let draggedIndex = null;
    const goalItems = rankingList.querySelectorAll('.goal-item');

    // Aggiungi event listeners a tutti gli elementi
    goalItems.forEach((item, index) => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });

    function handleDragStart(e) {
        draggedElement = this;
        draggedIndex = Array.from(rankingList.children).indexOf(this);
        this.classList.add('dragging');
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        
        // Rimuovi le classi di drag-over da tutti gli elementi
        const currentGoalItems = rankingList.querySelectorAll('.goal-item');
        currentGoalItems.forEach(item => {
            item.classList.remove('drag-over');
        });
        
        draggedElement = null;
        draggedIndex = null;
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (draggedElement !== this) {
            const currentIndex = Array.from(rankingList.children).indexOf(this);
            
            if (draggedIndex < currentIndex) {
                rankingList.insertBefore(draggedElement, this.nextSibling);
            } else {
                rankingList.insertBefore(draggedElement, this);
            }
            
            // Aggiorna i numeri di ranking
            updateRankingNumbers();
            
            // Aggiungi effetto visivo
            draggedElement.classList.add('pulse');
            setTimeout(() => {
                draggedElement.classList.remove('pulse');
            }, 600);
            
            // Salva la nuova classifica
            saveRanking();
        }

        this.classList.remove('drag-over');
        return false;
    }

    function updateRankingNumbers() {
        const items = rankingList.querySelectorAll('.goal-item');
        items.forEach((item, index) => {
            const rankNumber = item.querySelector('.rank-number');
            rankNumber.textContent = index + 1;
        });
    }

    function saveRanking() {
        const items = rankingList.querySelectorAll('.goal-item');
        const ranking = Array.from(items).map((item, index) => ({
            goal: item.dataset.goal,
            position: index + 1,
            name: item.querySelector('.goal-name').textContent
        }));
        
        // Salva in memoria (puoi estendere per salvare in localStorage se necessario)
        console.log('Nuova classifica:', ranking);
    }

    // Inizializza la classifica
    updateRankingNumbers();
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

const msgContainer = document.querySelector('#msgContainer');
const queryText = document.querySelector("#inputBox");
const inputButton = document.querySelector(".inputButton");
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

document.getElementById('reset').addEventListener('click', resetConversation);

// Funzione per resettare la chat
function resetConversation() {
    // Crea l'overlay
    //generateDialog("info", "Da fixare", "Sembra funzionare ma c'e qualcosa che non va, da debuggare :D", () => {});
    //return;
    generateDialog("confirm", "Reset della chat", "Sei sicuro di voler resettare la chat con Casper?", async ()=>{
      let response = await getData(resetConversationUrl)
      if (response.status === "ok") {
        msgContainer.innerHTML = ''; // Pulisce il contenitore dei messaggi
        document.querySelector(".chat-id").textContent = "Chat ID: "+response.session_id; // Aggiorna l'ID della sessione
        chat_session_id = response.session_id; // Aggiorna la variabile globale della sessione
      }else{
        generateDialog("info", "Errore", "Errore durante il reset della chat, riprova più tardi.", () => {});
      }
    });
    
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

// ========================= InputButton Change ===================== //
queryText.addEventListener("keydown", (event) =>{
	if (event.keyCode == 13 && queryText.value == ""){
		event.preventDefault()
	}else if (event.keyCode == 13 && queryText.value != "" &&!event.shiftKey){
		event.preventDefault()
		generateUserMsg();
	}
})


function printUserGoalProblems(problemsGoalList) {
  console.log("printUserGoalProblems", problemsGoalList);
  
  const goalAdvContainer = document.querySelector('#goal-adv-container');
  goalAdvContainer.innerHTML = ''; 

  printGoalOverview(problemsGoalList);
  
  if (!problemsGoalList || problemsGoalList.length === 0) {
    const noProblemsDiv = document.createElement('div');
    noProblemsDiv.className = 'no-problems-message';
    noProblemsDiv.innerHTML = `
      <div class="no-problems-message">
       Le tue automazioni sono allineate con i tuoi obiettivi 😊
       <br>
        Se hai bisogno di aiuto, chiedi a Casper!
      </div>
    `;
    goalAdvContainer.appendChild(noProblemsDiv);
    document.querySelector('#n_goal_advisor').innerText = 0;
    return;
  }

  goalAdvContainer.innerHTML = '';
  document.querySelector('#n_goal_advisor').innerText = problemsGoalList.length;

  // Wrapper principale
  const automationListWrapper = document.createElement('div');
  automationListWrapper.className = 'automation-list-wrapper';

  goalAdvContainer.appendChild(automationListWrapper);

  problemsGoalList.forEach((problem, index) => {
    // Container per ogni problema
    const problemGoalContainer = document.createElement('div');
    problemGoalContainer.className = 'problem-goal-container';

    // Card principale
    const card = document.createElement('div');
    card.className = 'automation-card problem-goal-card';
    card.style.display = 'block';
    card.setAttribute('onclick', 'toggleCardExpansion(this)');

    // Header della card
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    // Parte destra con icona e info automazione
    const rightSection = document.createElement('div');
    rightSection.style.display = 'flex';
    rightSection.style.alignItems = 'center';
    rightSection.style.float = 'right';

    // Se ci sono regole associate
    if (problem.rules && problem.rules.length > 0) {
      const rule = problem.rules[0]; // Prendi la prima regola

      // Icona automazione
      const automationIcon = document.createElement('div');
      const iconInfo = getAutomationIconInfo(rule);
      automationIcon.className = `automation-icon ${iconInfo.className}`;
      automationIcon.textContent = iconInfo.icon;

      // Container per titolo e ID
      const titleContainer = document.createElement('div');
      
      const automationTitle = document.createElement('div');
      automationTitle.className = 'automation-title';
      automationTitle.textContent = rule.name || 'Automazione senza nome';

      const automationId = document.createElement('div');
      automationId.className = 'automation-id';
      automationId.textContent = `ID ${rule.id}`;

      titleContainer.appendChild(automationTitle);
      titleContainer.appendChild(automationId);

      rightSection.appendChild(automationIcon);
      rightSection.appendChild(titleContainer);
    }

    // Parte sinistra con tag goal e severity
    const leftSection = document.createElement('div');
    leftSection.style.float = 'left';

    // Goal tag
    const goalTag = document.createElement('span');
    goalTag.className = 'goal-tag';
    const goalIcons = {
      'energy': '🔋 Energia',
      'security': '🛡️ Sicurezza', 
      'health': '❤️ Salute',
      'well-being': '🌱 Benessere'
    };
    goalTag.textContent = goalIcons[problem.goal] || `🎯 ${problem.goal}`;

    // Severity badge
    const severityBadge = document.createElement('span');
    severityBadge.className = 'severity-badge severity-medium'; //TODO: Cambia in base alla severity
    // Imposta il testo in base alla severity
    severityBadge.textContent = 'Medio';

    leftSection.appendChild(goalTag);
    leftSection.appendChild(severityBadge);

    // Assembla header (prima right, poi left come nel template)
    cardHeader.appendChild(rightSection);
    cardHeader.appendChild(leftSection);

    // Descrizione
    const automationDescription = document.createElement('div');
    automationDescription.className = 'automation-description';
    
    if (problem.negative_effects && problem.negative_effects.length > 0) {
      // Prendi il primo effetto negativo che non sia vuoto
      const firstEffect = problem.negative_effects.find(effect => 
        Array.isArray(effect) ? effect[0] && effect[0].trim() : effect && effect.trim()
      );
      
      if (Array.isArray(firstEffect)) {
        automationDescription.textContent = firstEffect[0] || 'Questa automazione non ha una descrizione';
      } else {
        automationDescription.textContent = firstEffect || 'Questa automazione non ha una descrizione';
      }
    } else {
      automationDescription.textContent = 'Questa automazione non ha una descrizione';
    }

    // Pulsante di espansione
    const expandButton = document.createElement('div');
    expandButton.className = 'expand-button';
    
    const expandIcon = document.createElement('i');
    expandIcon.className = 'expand-icon';
    expandButton.appendChild(expandIcon);

    // Assembla la card
    card.appendChild(cardHeader);
    card.appendChild(automationDescription);
    card.appendChild(expandButton);

    // Container per il contenuto espanso
    const explanationContainer = document.createElement('div');
    explanationContainer.className = 'problem-goal-explanation-container';
    
    const explanation = document.createElement('div');
    explanation.className = 'problem-goal-explanation';
    explanation.setAttribute('display', 'none');
    
    // Sezione espansa con spiegazione dettagliata
    const expandedSection = document.createElement('div');
    expandedSection.className = 'expanded-section';
    
    // Spiegazione del problema
    let problemExplanation = 'Spiegazione del problema non disponibile.';
    if (problem.negative_effects && problem.negative_effects.length > 0) {
      const effect = problem.negative_effects[0];
      if (Array.isArray(effect) && effect[4] && effect[4].description) {
        problemExplanation = effect[4].description;
      } else if (Array.isArray(effect) && effect[0]) {
        problemExplanation = effect[0];
      }
    }
    
    const problemText = document.createTextNode(problemExplanation + ' ');
    expandedSection.appendChild(problemText);
    
    // Titolo "Come posso risolvere?"
    const cardTitle = document.createElement('p');
    cardTitle.className = 'card-title';
    cardTitle.textContent = 'Come posso risolvere?';
    expandedSection.appendChild(cardTitle);
    
    // Container per le opzioni radio
    const optionsContainer = document.createElement('div');
    
    // Estrai le opzioni di risoluzione reali dai recommendations
    let resolutionOptions = [];
    if (problem.negative_effects && problem.negative_effects.length > 0) {
      const effect = problem.negative_effects[0];
      if (Array.isArray(effect) && effect[4] && effect[4].recommendations) {
        const recommendations = effect[4].recommendations;
        // Prendi il primo automation_id dalle recommendations
        const firstAutomationId = Object.keys(recommendations)[0];
        if (firstAutomationId && recommendations[firstAutomationId].alternatives) {
          resolutionOptions = recommendations[firstAutomationId].alternatives.map(alt => alt.natural_language);
        }
      }
    }
    
    // Se non ci sono opzioni reali, usa quelle di fallback
    if (resolutionOptions.length === 0) {
      resolutionOptions = [
        'Spegni automaticamente il dispositivo dopo un determinato periodo di tempo.',
        'Aggiungi una condizione per verificare se il dispositivo è già acceso prima di accenderlo.'
      ];
    }
    
    resolutionOptions.forEach((option, optionIndex) => {
      const formCheck = document.createElement('div');
      formCheck.className = 'form-check';
      
      const radioInput = document.createElement('input');
      radioInput.className = 'form-check-input';
      radioInput.type = 'radio';
      radioInput.name = `radioDefault${index}`;
      radioInput.id = `radioDefault${index}-${optionIndex}`;
      
      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.setAttribute('for', `radioDefault${index}-${optionIndex}`);
      label.textContent = option;
      
      formCheck.appendChild(radioInput);
      formCheck.appendChild(label);
      optionsContainer.appendChild(formCheck);
    });
    
    expandedSection.appendChild(optionsContainer);
    explanation.appendChild(expandedSection);
    
    // Sezione azioni con pulsanti
    const expandedActions = document.createElement('div');
    expandedActions.className = 'expanded-actions action-buttons';
    
    // Pulsante Ignora
    const ignoreBtn = document.createElement('button');
    ignoreBtn.className = 'btn btn-ignore';
    ignoreBtn.id = `${problem.unique_id || problem.id}_ignore`;
    ignoreBtn.setAttribute('problemid', problem.id);
    ignoreBtn.textContent = 'Ignora';
    
    // Pulsante Risolvi
    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'btn btn-resolve';
    resolveBtn.id = `${problem.unique_id || problem.id}_resolve`;
    resolveBtn.setAttribute('problemid', problem.id);
    resolveBtn.textContent = 'Risolvi';
    
    expandedActions.appendChild(ignoreBtn);
    expandedActions.appendChild(resolveBtn);
    explanation.appendChild(expandedActions);
    
    explanationContainer.appendChild(explanation);

    // Assembla tutto
    problemGoalContainer.appendChild(card);
    problemGoalContainer.appendChild(explanationContainer);
    automationListWrapper.appendChild(problemGoalContainer);
  });
}

function printGoalOverview(problemsGoalList) {
  const goalAdvContainer = document.querySelector('#goal-adv-container');
  
  // Crea l'overview panel
  const overviewPanel = document.createElement('div');
  overviewPanel.className = 'overview-panel';
  
  const goalsContainer = document.createElement('div');
  goalsContainer.className = 'goals-container';
  
  // Definisci i goals con i loro dati  #TODO: i dati "score" dovrebbero essere generati in base ai problemi rilevati
  const goals = [
    {
      name: '🌱 Benessere',
      score: 15,
      progressClass: 'progress-low'
    },
    {
      name: '🔋 Energia',
      score: 35,
      progressClass: 'progress-medium-low'
    },
    {
      name: '❤️ Salute',
      score: 65,
      progressClass: 'progress-medium'
    },
    {
      name: '🛡️ Sicurezza',
      score: 85,
      progressClass: 'progress-high'
    }
  ];
  
  // Crea ogni goal item
  goals.forEach(goal => {
    const goalItemOverview = document.createElement('div');
    goalItemOverview.className = 'goal-item-overview';
    
    // Goal score container
    const goalScore = document.createElement('div');
    goalScore.className = 'goal-score';
    
    // Circular progress
    const circularProgress = document.createElement('div');
    circularProgress.className = `circular-progress ${goal.progressClass}`;
    
    // SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    
    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '20');
    bgCircle.setAttribute('cy', '20');
    bgCircle.setAttribute('r', '18');
    bgCircle.setAttribute('class', 'bg-circle');
    
    // Progress circle
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', '20');
    progressCircle.setAttribute('cy', '20');
    progressCircle.setAttribute('r', '18');
    progressCircle.setAttribute('class', 'progress-circle');
    
    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    
    // Progress text
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    progressText.textContent = `${goal.score}%`;
    
    circularProgress.appendChild(svg);
    circularProgress.appendChild(progressText);
    goalScore.appendChild(circularProgress);
    
    // Goal info
    const goalInfo = document.createElement('div');
    goalInfo.className = 'goal-info';
    
    const goalName = document.createElement('div');
    goalName.className = 'goal-name';
    goalName.innerHTML = goal.name.replace(' ', '&nbsp;');
    
    goalInfo.appendChild(goalName);
    
    // Assembla il goal item
    goalItemOverview.appendChild(goalScore);
    goalItemOverview.appendChild(goalInfo);
    
    goalsContainer.appendChild(goalItemOverview);
  });
  
  overviewPanel.appendChild(goalsContainer);
  
  // Inserisci l'overview panel all'inizio del container
  goalAdvContainer.insertBefore(overviewPanel, goalAdvContainer.firstChild);
}

// ===================== Carousel ======================= //

function printUserProblems(problemsList) {
  problemsContainer.querySelector('.loader-container').style.display = 'none';
  const carouselControls = document.getElementById('carousel-controls');
  const carouselMessages = document.getElementById('carousel-messages');
 
  let trueProblemNumber = 0;
  if (!problemsList || problemsList.length === 0) {
      // Nascondi i controlli e mostra il messaggio
      carousel.innerHTML = '';
      carouselControls.style.display = 'none';
      carouselMessages.innerHTML = `
          <div class="no-problems-message">
              Non sono presenti problemi nella tua smart home 😊
              <br>
              <span class="no-problems-submessage">Se hai bisogno di aiuto, chiedi a Casper!</span>
          </div>
      `;
      document.querySelector('#n_problems').innerText = 0;
      carouselMessages.style.display = 'block';
  } else {
    // Mostra i controlli e nascondi il messaggio
      carousel.innerHTML = ''; // Pulisce il contenuto del carousel
      carouselControls.style.display = 'flex';
      carouselMessages.innerHTML = '';
      carouselMessages.style.display = 'none';
      for (const [index, problem] of problemsList.entries()){
        if (problem['ignore'] == true || problem['solved'] == true) continue; // Ignora i problemi marcati come "ignore"
        if (problem['type'] == 'conflict'){
          createConflictCard(
            index == 0,
            `Conflitto ${problem['id']}`,
            problem
          )
          trueProblemNumber++;
        }
        else if (problem['type'].split('-')[1] == 'chain'){
          createChainCard(
            index == 0,
            `Catena ${problem['id']}`,
            problem
          )
          trueProblemNumber++;
        }else{
          //TODO: aggiungere i problemi di tipo "energy"
          console.log("Nessun problema associato a questo account");
        }
      }
      document.querySelector('#n_problems').innerText = trueProblemNumber;
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

    // DETERMINA LA DIREZIONE DELLA CATENA
    const chainDirection = chainInfo['direction'] || 'rule1_to_rule2';
    const isReversed = chainDirection === 'rule2_to_rule1';
    
    // IMPOSTA L'ORDINE CORRETTO PER LA VISUALIZZAZIONE
    let firstRule, secondRule, firstRuleId, firstRuleName, secondRuleId, secondRuleName;
    
    if (isReversed) {
        // Se la direzione è rule2 → rule1, inverti l'ordine visuale
        firstRule = rule2;
        secondRule = rule1;
        firstRuleId = rule2_id;
        firstRuleName = rule2_name;
        secondRuleId = rule1_id;
        secondRuleName = rule1_name;
    } else {
        // Direzione normale: rule1 → rule2
        firstRule = rule1;
        secondRule = rule2;
        firstRuleId = rule1_id;
        firstRuleName = rule1_name;
        secondRuleId = rule2_id;
        secondRuleName = rule2_name;
    }

    const rule1_match = firstRule['description'].match(regex);
    const rule2_match = secondRule['description'].match(regex);

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

    // FIRST AUTOMATION CARD (basato sulla direzione)
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
    firstSubtitle.textContent = firstRuleName;

    // Assemble first automation card
    firstAutomation.appendChild(firstIcon);
    firstAutomation.appendChild(firstTitle);
    firstAutomation.appendChild(firstSubtitle);

    // First arrow
    const firstArrow = document.createElement("div");
    firstArrow.className = "flow-arrow";
    firstArrow.textContent = "→";

    // Variable card (per catene indirette)
    const variableCard = document.createElement("div");
    variableCard.className = "variable-chain-card";

    // Second arrow
    const secondArrow = document.createElement("div");
    secondArrow.className = "flow-arrow";
    secondArrow.textContent = "→";

    // SECOND AUTOMATION CARD (basato sulla direzione)
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
    secondSubtitle.textContent = secondRuleName;

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

    // ASSEMBLE THE FLOW 
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
        
        // DETERMINA IL NOME CORRETTO BASATO SULL'ID
        let automationName = "";
        if (automationID === rule1_id) {
            automationName = rule1_name;
        } else if (automationID === rule2_id) {
            automationName = rule2_name;
        } else {
            automationName = "Automazione sconosciuta";
        }
        
        button.textContent = `Modifica l'automazione "${automationName}"`;

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
    ignoreButton.id = chainInfo["unique_id"];
    ignoreButton.setAttribute("problemid", chainInfo["id"]);
    ignoreButton.addEventListener("click", (e) => {
      generateDialog("confirm", "Conferma ignora", "Sei sicuro di voler ignorare questo problema?", () => {
        postData(
          {problemId: e.target.getAttribute("problemid")},
          ignoreProblem)
        .then((response) => {
          e.target.closest('.card').remove();
          let n_prob = document.querySelector('#n_problems').innerText
          let new_n_prob = parseInt(n_prob) - 1;
          document.querySelector('#n_problems').innerText = new_n_prob;
          if(new_n_prob == 0) {
            document.querySelector('.carousel-controls').style.display = 'none';
            document.getElementById('carousel-messages').style.display = 'flex';
            document.getElementById('carousel-messages').innerHTML = `
                <div class="no-problems-message">
                    Non sono presenti problemi nella tua smart home 😊
                    <br>
                    <span class="no-problems-submessage">Se hai bisogno di aiuto, chiedi a Casper!</span>
                </div>
            `;  
          }
          console.log("Problem ignored:", response);
        }).catch((error) => {
          generateDialog("info", "Errore", "Si è verificato un errore e non posso eliminare il problema",() => {});
          console.error("Error ignoring problem:", error);
        });
      });
    });

    const solveButton = document.createElement("button");
    solveButton.className = "btn btn-resolve";
    solveButton.textContent = "Risolvi";
    solveButton.id =  chainInfo["unique_id"];
    solveButton.setAttribute("problemid", chainInfo["id"]);
    solveButton.addEventListener("click", async (e) => { 
     if (choosenSolution != null) {
 
        e.target.innerHTML = `
          <span>Risoluzione...</span>
        `;
        e.target.disabled = true;

        let problemId = e.target.getAttribute("problemid");
        let ruleId = choosenSolution.rule_id;
        let ruleName = choosenSolution.rule_name;
        let structured = choosenSolution.solution;
        const message = `<solve_problem>The user want to solve the problem with ID:${problemId} by modifing the automation '${ruleName}'(Automation ID:${ruleId}) in the following way: ${structured}</solve_problem>`;
        console.log("Solve button clicked with message:", message);
        
        getBotResponse(message);
        
        // Aggiorna il contatore dei problemi
        let n_prob = document.querySelector('#n_problems').innerText;
        let new_n_prob = parseInt(n_prob) - 1;
        document.querySelector('#n_problems').innerText = new_n_prob;
        
        // Se non ci sono più problemi, mostra il messaggio
        if(new_n_prob == 0) {
          document.querySelector('.carousel-controls').style.display = 'none';
          document.getElementById('carousel-messages').style.display = 'flex';
          document.getElementById('carousel-messages').innerHTML = `
              <div class="no-problems-message">
                  Non sono presenti problemi nella tua smart home 😊
                  <br>
                  <span class="no-problems-submessage">Se hai bisogno di aiuto, chiedi a Casper!</span>
              </div>
          `;  
        }
        // Rimuovi la carta dal DOM
        e.target.closest('.card').remove();

      } else {
        generateDialog("info", "Selezione richiesta", "Seleziona una soluzione prima di procedere.", () => {});
      }
    });

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

             input.addEventListener("change", () => {
                if (input.checked) {
                  choosenSolution = {
                    "rule_id": automationID,
                    "rule_name": temp_mapping.get(automationID)["name"],
                    "solution": alternative["structured"],
                  }
                  console.log("Choosen solution:", choosenSolution);
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
    }
    cardBody.appendChild(accordion);

    // ACTION BUTTONS
    const actionButtons = document.createElement("div");
    actionButtons.className = "action-buttons";

    const ignoreButton = document.createElement("button");
    ignoreButton.className = "btn btn-ignore";
    ignoreButton.textContent = "Ignora";
    ignoreButton.id = conflictInfo["unique_id"];
    ignoreButton.setAttribute("problemid", conflictInfo["id"]);
    ignoreButton.addEventListener("click", (e) => {
      generateDialog("confirm", "Conferma ignora", "Sei sicuro di voler ignorare questo problema?", () => {
        postData(
          {problemId: e.target.getAttribute("problemid")},
          ignoreProblem)
        .then((response) => {
          e.target.closest('.card').remove();
          let n_prob = document.querySelector('#n_problems').innerText;
          let new_n_prob = parseInt(n_prob) - 1;
          document.querySelector('#n_problems').innerText = new_n_prob;
          if(new_n_prob == 0) {
            document.querySelector('.carousel-controls').style.display = 'none';
            document.getElementById('carousel-messages').style.display = 'flex';
            document.getElementById('carousel-messages').innerHTML = `
                <div class="no-problems-message">
                    Non sono presenti problemi nella tua smart home 😊
                    <br>
                    <span class="no-problems-submessage">Se hai bisogno di aiuto, chiedi a Casper!</span>
                </div>
            `;  
          }
          console.log("Problem ignored:", response);
        }).catch((error) => {
          generateDialog("info", "Errore", "Si è verificato un errore e non posso eliminare il problema",() => {});
          console.error("Error ignoring problem:", error);
        });
      });
    });
    const solveButton = document.createElement("button");
    solveButton.className = "btn btn-resolve";
    solveButton.textContent = "Risolvi";
    solveButton.id =  conflictInfo["unique_id"];
    solveButton.setAttribute("problemid", conflictInfo["id"]);
    
    solveButton.addEventListener("click", async (e) => { 
     if (choosenSolution != null) {
 
        e.target.innerHTML = `
          <span>Risoluzione...</span>
        `;
        e.target.disabled = true;

        let problemId = e.target.getAttribute("problemid");
        let ruleId = choosenSolution.rule_id;
        let ruleName = choosenSolution.rule_name;
        let structured = choosenSolution.solution;
        const message = `<solve_problem>The user want to solve the problem with ID:${problemId} by modifing the automation '${ruleName}'(Automation ID:${ruleId}) in the following way: ${structured}</solve_problem>`;
        console.log("Solve button clicked with message:", message);
        
        getBotResponse(message);
        
        // Aggiorna il contatore dei problemi
        let n_prob = document.querySelector('#n_problems').innerText;
        let new_n_prob = parseInt(n_prob) - 1;
        document.querySelector('#n_problems').innerText = new_n_prob;
        
        // Se non ci sono più problemi, mostra il messaggio
        if(new_n_prob == 0) {
          document.querySelector('.carousel-controls').style.display = 'none';
          document.getElementById('carousel-messages').style.display = 'flex';
          document.getElementById('carousel-messages').innerHTML = `
              <div class="no-problems-message">
                  Non sono presenti problemi nella tua smart home 😊
                  <br>
                  <span class="no-problems-submessage">Se hai bisogno di aiuto, chiedi a Casper!</span>
              </div>
          `;  
        }

        // Rimuovi la carta dal DOM
        e.target.closest('.card').remove();

      } else {
        generateDialog("info", "Selezione richiesta", "Seleziona una soluzione prima di procedere.", () => {});
      }
    });

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
  let status = document.querySelector('.agent-status');
  let indicator = document.querySelector('.status-indicator-chat');
   try {
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
        status.textContent = "Errore di connessione";
        indicator.classList.add('error');
        indicator.classList.remove('inactive');
        return 'unknown';
    }
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

function toggleCardExpansion(element) {
    // Check if this is a problem-goal-card
    if (element.classList.contains('problem-goal-card')) {
        const explanationContainer = element.nextElementSibling;
        if (explanationContainer && explanationContainer.classList.contains('problem-goal-explanation-container')) {
            explanationContainer.classList.toggle('open');
            
            // Toggle the expand button icon
            const expandButton = element.querySelector('.expand-button');
            if (expandButton) {
                element.classList.toggle('active');
                expandButton.classList.toggle('expanded');
            }
        }
        return;
    }
    
    // Original logic for expandable-card
    const card = element.closest('.expandable-card');
    const expandButton = card.querySelector('.expand-button');
    const expandedContent = card.querySelector('.expanded-content');
    
    // Toggle delle classi active
    expandButton.classList.toggle('active');
    expandedContent.classList.toggle('active');
    
    // Aggiorna l'altezza dinamicamente
    if (expandedContent.classList.contains('active')) {
        expandedContent.style.maxHeight = expandedContent.scrollHeight + 'px';
    } else {
        expandedContent.style.maxHeight = '0px';
    }
}

const overlay = document.getElementById('overlay');
const dialog = document.querySelector('.confirm-dialog');
const dialogTitle = document.querySelector('.confirm-dialog-title');
const dialogDescription = document.querySelector('.confirm-dialog-description');
const btnYes = document.querySelector('.confirm-btn.yes');
const btnNo = document.querySelector('.confirm-btn.no');  
const btnOk = document.querySelector('.confirm-btn.ok');
function generateDialog(type, title, description, yesCallback){
  //type: "confirm" (Ha i bottoni "Si", "No"), "info" (Ha il bottone "OK")
    overlay.style.display = 'flex';
    //dialog.style.display = 'block';
    dialogTitle.innerText = title;
    dialogDescription.innerText = description;
    if (type === "confirm") {
        btnYes.style.display = 'inline-block';
        btnNo.style.display = 'inline-block';
        btnOk.style.display = 'none';
    } else if (type === "info") {
        btnYes.style.display = 'none';
        btnNo.style.display = 'none';
        btnOk.style.display = 'inline-block';
    }

    const buttons = dialog.querySelectorAll('.confirm-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            // Aggiungi la classe fadeOut all'overlay per l'animazione di uscita
            overlay.classList.add('fadeOut');
            // Rimuovi l'overlay dopo che l'animazione è completata
            setTimeout(async () => {
                if (button.classList.contains('yes')) {
                    yesCallback();
                }
                overlay.classList.remove('fadeOut');
                overlay.style.display= 'none';
            }, 200); // Stesso tempo dell'animazione CSS dell'overlay
        });
    });

}