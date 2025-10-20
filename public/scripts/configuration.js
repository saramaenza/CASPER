//const tokenRaw = Cookies.get("auth-token");
//const chat_session_id = Cookies.get("chat_session_id");
//const token = jwt_decode(tokenRaw);
//const userId = token.id;

// Fetch data config from the database
async function fetchConfig(userId) {
    try {
        const response = await fetch(`/casper/get_config?id=${userId}`, { 
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero della configurazione');
        }

        const config = await response.json();
        return config || {};
    } catch (error) {
        console.error('Errore durante il recupero della configurazione:', error);
        return {};
    }
}

// Funzione per rilevare problemi nelle automazioni
async function detectProblems(userId, sessionId, automations) {
    try {
        const response = await fetch('/casper/detect_problem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                session_id: sessionId,
                automations: automations,
            }),
        });
        if (!response.ok) {
            throw new Error('Errore durante il rilevamento dei problemi');
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Errore durante il rilevamento dei problemi:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlInput = document.getElementById('home-assistant-url');
    const tokenInput = document.getElementById('home-assistant-token');
    const loadButton = document.getElementById('load-devices');
    const statusMessage = document.getElementById('status-message');
    const devicesList = document.getElementById('devices-list');

    // Carica credenziali salvate
    const { auth: { url: savedUrl, token: savedToken } = {}, config: savedDevices = [], selected: selectedDevices = [] } = await fetchConfig(userId);
    
    if (savedUrl) urlInput.value = savedUrl;
    if (savedToken) tokenInput.value = savedToken;
    if (savedDevices) {
        displayDevices(savedDevices);
        // Ripristina le selezioni precedenti
        selectedDevices.forEach(deviceId => {
            //console.log(deviceId);
            const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId.e}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    const groupedDevices = groupDevicesByRoom(savedDevices || []);

    // Controlla se tutte le checkbox di una stanza sono selezionate
    Object.entries(groupedDevices).forEach(([room, roomDevices]) => {
        // Trova il contenitore della stanza corrente
        const roomCard = Array.from(document.querySelectorAll('.room-card-config')).find(card => {
            const roomNameElement = card.querySelector('.room-name');
            return roomNameElement && roomNameElement.textContent.trim() === room;
        });

        if (!roomCard) return;

        // Trova i checkbox dei dispositivi solo all'interno della stanza corrente
        const roomCheckboxes = roomDevices.map(device => 
            roomCard.querySelector(`.device-checkbox[data-device-id="${device.e}"]`)
        );

        // Controlla se tutti i checkbox della stanza sono selezionati
        const allChecked = roomCheckboxes.every(checkbox => checkbox && checkbox.checked);
        const selectAllCheckbox = roomCard.querySelector(`.select-all-checkbox`);
        if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
    });

    // Funzione per validare i campi input
    function validateInputFields() {
        // Rimuovi eventuali classi di errore precedenti
        urlInput.classList.remove('error');
        tokenInput.classList.remove('error');
        statusMessage.classList.add('hidden');
        
        let isValid = true;
        let errorMessage = '';
        
        // Controlla se l'URL è vuoto
        if (!urlInput.value.trim()) {
            urlInput.classList.add('error');
            errorMessage += 'Il campo URL Home Assistant è obbligatorio. ';
            isValid = false;
            loadButton.disabled = false;
            loadButton.innerHTML = 'Carica Configurazione';
        }
        
        // Controlla se il token è vuoto
        if (!tokenInput.value.trim()) {
            tokenInput.classList.add('error');
            errorMessage += 'Il campo Token di Accesso è obbligatorio. ';
            isValid = false;
            loadButton.disabled = false;
            loadButton.innerHTML = 'Carica Configurazione';
        }
        
        // Validazione formato URL (opzionale)
        if (urlInput.value.trim() && !isValidUrl(urlInput.value.trim())) {
            urlInput.classList.add('error');
            errorMessage += 'Inserisci un URL valido. ';
            isValid = false;
            loadButton.disabled = false;
            loadButton.innerHTML = 'Carica Configurazione';
        }
        
        // Mostra messaggio di errore se ci sono problemi
        if (!isValid) {
            showStatusMessage(errorMessage.trim(), 'error');
            devicesList.innerHTML = ''; // Svuota il contenuto del div devices-list
        }
        
        return isValid;
    }

    // Funzione per validare il formato URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Funzione per mostrare messaggi di stato
    function showStatusMessage(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');
    }

    // Aggiungi stili CSS per gli errori
    const style = document.createElement('style');
    document.head.appendChild(style);

    function groupDevicesByRoom(devices) {
        return devices.reduce((groups, device) => {
            const room = device.a || 'Altro';
            if (!groups[room]) {
                groups[room] = [];
            }
            groups[room].push(device);
            return groups;
        }, {});
    }

    async function displayDevices(devices) {
        devicesList.innerHTML = '';
        document.querySelectorAll('.save-devices-conf').forEach(el => el.remove()); // Rimuovi pulsante di salvataggio esistente
        const groupedDevices = groupDevicesByRoom(devices);

        // Clean and organize devices list
        let cleanList = formatDeviceList(devices);

        Object.entries(groupedDevices).forEach(([room, roomDevices]) => {
            const roomCard = document.createElement('div');
            roomCard.classList.add('room-card-config');

            // Intestazione della stanza con checkbox per selezionare/deselezionare tutti
            const roomHeader = document.createElement('div');
            roomHeader.classList.add('category-title-config');
            roomHeader.innerHTML = `
                <input type="checkbox" class="select-all-checkbox" title="Seleziona/Deseleziona tutti">
                <div class="automation-icon room-icon">${getIcon(room)}</div>
                <span class="room-name">${room}</span>
            `;
            roomCard.appendChild(roomHeader);

            // Contenitore per la lista dei dispositivi
            const devicesListContainer = document.createElement('div');
            devicesListContainer.classList.add('devicesList_container');
            devicesListContainer.style.maxHeight = '0'; // Nascondi inizialmente il contenitore
            devicesListContainer.style.overflow = 'hidden';
            devicesListContainer.style.transition = 'max-height 0.3s ease';

            // Lista dispositivi
            const deviceList = document.createElement('div');
            deviceList.classList.add('devices-list');

            roomDevices.forEach(device => {
                const deviceElement = document.createElement('div');
                deviceElement.classList.add('device-element');
                deviceElement.setAttribute('entityid', device.e);

                const icon = document.createElement('i');
                // Cerca il valore corrispondente in cleanList
                const roomDevicesList = cleanList[room] || [];
                const deviceData = roomDevicesList.find(d => d[2] === device.e); // Trova il dispositivo corrispondente
                // Usa l'icona trovata o una predefinita
                icon.classList.add('bx', deviceData ? deviceData[1] : 'bx-device');

                const deviceText = document.createElement('div');
                deviceText.classList.add('device-text');
                deviceText.innerHTML = `
                    <span class="device-name">${device.f} - <i>${device.df}</i></span>
                    <span class="device-type">${device.t}</span>
                `;
                // Checkbox per la selezione del dispositivo
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('device-checkbox');
                checkbox.dataset.deviceId = device.e;

                // Aggiungi elementi al dispositivo
                deviceElement.appendChild(checkbox);
                deviceElement.appendChild(icon);
                deviceElement.appendChild(deviceText);

                // Aggiungi il dispositivo alla lista
                deviceList.appendChild(deviceElement);
            });

            devicesListContainer.appendChild(deviceList);
            roomCard.appendChild(devicesListContainer);
            devicesList.appendChild(roomCard);

            // Aggiungi evento per aprire/chiudere la lista dei dispositivi
            roomHeader.addEventListener('click', (event) => {
                // Evita che il click sul checkbox triggeri l'apertura/chiusura
                if (event.target.classList.contains('select-all-checkbox')) return;

                const isOpen = devicesListContainer.style.maxHeight !== '0px';
                devicesListContainer.style.maxHeight = isOpen ? '0' : `${deviceList.scrollHeight}px`;

                // Aggiungi o rimuovi la classe 'active' per il comportamento della freccia
                roomHeader.classList.toggle('active');
            });

            // Aggiungi evento per selezionare/deselezionare tutti i dispositivi della stanza
            const selectAllCheckbox = roomHeader.querySelector('.select-all-checkbox');
            selectAllCheckbox.addEventListener('change', () => {
                const isChecked = selectAllCheckbox.checked;
                const checkboxes = deviceList.querySelectorAll('.device-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });

            });
        });

        devicesList.classList.remove('hidden');

        // Ripristina le selezioni precedenti 
        const { config: savedDevices = [], selected: selectedDevices = [] } = await fetchConfig(userId);

        selectedDevices.forEach(deviceId => {
            const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId}"]`);
            if (checkbox) checkbox.checked = true;
        });

        if (savedDevices.length > 0) {
            // Crea un contenitore per il pulsante di salvataggio
            const saveDevicesContainer = document.createElement('div');
            saveDevicesContainer.classList.add('save-devices-conf');

            // Crea il pulsante per salvare i dispositivi selezionati
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Salva Oggetti Selezionati';
            saveButton.classList.add('btn', 'btn-save');
            saveButton.id = 'save-selection';

            // Aggiungi il pulsante al contenitore
            saveDevicesContainer.appendChild(saveButton);

            // Aggiungi il contenitore al DOM
            devicesList.parentElement.appendChild(saveDevicesContainer);


            // Aggiungi evento per salvare i dispositivi selezionati e generare suggerimenti
            saveButton.addEventListener('click', async() => {
                try {
                    const selectedDevices = Array.from(document.querySelectorAll('.device-checkbox:checked'))
                        .map(checkbox => checkbox.dataset.deviceId);

                    const response = await fetch(`${base_link}/casper/save_config`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({'userId': userId, 'devices': selectedDevices }),
                    });

                    if (!response.ok) {
                        generateDialog(
                            "error",
                            "Errore durante il salvataggio",
                            `Si è verificato un errore: ${error.message}`,
                            () => {}
                        );
                    }else{
                        let devicesList = await getData(`${getDevices}?id=${userId}`) //GET dispositivi
                        printUserDevices(devicesList); //PRINT devices
                        // Mostra un messaggio di conferma
                        generateDialog(
                            "success",
                            "Salvataggio completato",
                            "Gli oggetti selezionati sono stati salvati con successo.",
                            () => {}
                        );
                        // controlla se esistono già le preferenze per l'utente
                        const checkPreferences = await fetch(`/casper/get_user_preferences?user_id=${userId}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        const preferencesExist = await checkPreferences.json();

                        const ranking = preferencesExist.ranking;

                        if (ranking == undefined) {
                
                            const defaultRanking = [
                                {id: 'sicurezza', position: 1, name: 'Sicurezza', icon: '🛡️'},
                                {id: 'salute', position: 2, name: 'Salute', icon: '❤️'},
                                {id: 'energia', position: 3, name: 'Energia', icon: '🔋'},
                                {id: 'benessere', position: 4, name: 'Benessere', icon: '🌱'}
                            ];
                            const response_preferences = await fetch(`/casper/save_user_preferences`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({'user_id': userId, 'ranking': defaultRanking }),
                            });
                        
                            if (!response_preferences.ok) {
                                throw new Error('errore nel salvataggio delle preferenze di default');
                            } 

                            await fetch('/casper/get_goal_improvements', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ user_id: userId })
                            });
                        }

                        else {
                            await saveUserPreferences(ranking, false);
                        }

                        // Mostra loader nella suggestions-container
                        let suggestionsContainer = document.querySelector('.suggestions-container');
                        if (suggestionsContainer) {
                            suggestionsContainer.innerHTML = `
                                <div class="suggestions-loader">
                                    <div class="loader"></div>
                                    <span>Generazione dei suggerimenti in corso...</span>
                                </div>
                            `;
                        }

                        fetch('/casper/get_goal_improvements', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ user_id: userId })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (suggestionsContainer) {
                                loadAndShowSuggestions(suggestionsContainer);
                            }
                        })
                        .catch(error => {
                            console.log(error);
                            if (suggestionsContainer) {
                                suggestionsContainer.innerHTML = '<div class="suggestions-error">Errore nella generazione dei suggerimenti.</div>';
                            }
                        });
                        
                    }

                } catch (error) {
                    // Mostra un messaggio di errore
                    generateDialog(
                        "error",
                        "Errore durante il salvataggio",
                        `Si è verificato un errore: ${error.message}`,
                        () => {}
                    );
                }
            });
        }
    }

    loadButton.addEventListener('click', async () => {
        document.querySelectorAll('.save-devices-conf').forEach(el => el.remove()); // Rimuovi pulsante di salvataggio esistente

        loadButton.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;">' +
                           '<div class="loader mini-loader"></div>' +
                           '<span>Caricamento Configurazione...</span>' +
                           '</div>';
        loadButton.disabled = true; // Disabilita il pulsante durante il caricamento

        // Prima ottieni i riferimenti alle variabili necessarie
        const tokenRaw = Cookies.get("auth-token");
        const token = jwt_decode(tokenRaw);
        const userId = token.id;

        try {
            const url = urlInput.value.trim().replace(/\/+$/, '');
            const token = tokenInput.value.trim();

            if (!validateInputFields()) {
                return;
            } 

            // Prima testa la connessione con gestione degli errori migliorata
            let testResponse;
            try {
                testResponse = await fetch(`/casper/test_connection`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({'url': url, 'token': token }),
                });
            } catch (fetchError) {
                console.error('Errore nella chiamata di test:', fetchError);
                generateDialog("error", "Errore di connessione", 
                    "Non riesco a connettermi a Home Assistant. Controlla la tua connessione internet e assicurati che l'URL e il token di Home Assistant siano corretti.", 
                    () => {}
                );
                return;
            }

            // Controlla se la risposta è JSON valido
            let errorData;
            try {
                if (!testResponse.ok) {
                    const responseText = await testResponse.text();
                    // Prova a fare il parsing JSON, se fallisce usa il testo
                    try {
                        errorData = JSON.parse(responseText);
                    } catch (jsonError) {
                        console.error('Risposta non JSON ricevuta:', responseText);
                        generateDialog("error", "Errore del server", 
                            "Il server ha restituito una risposta non valida. Controlla i log del server.", 
                            () => {}
                        );
                        return;
                    }
                    
                    generateDialog("error", "Errore di connessione", 
                        `Non riesco a connettermi a Home Assistant. Controlla la tua connessione internet e assicurati che l'URL e il token di Home Assistant siano corretti.`, 
                        () => {}
                    );
                    return;
                }
            } catch (error) {
                console.error('Errore nel controllo della risposta:', error);
                generateDialog("error", "Errore di comunicazione", 
                    "Errore nella comunicazione con il server.", 
                    () => {}
                );
                return;
            }

            //Recupero le credenziali salvate per verificare se sono cambiate
            const configDB = await fetchConfig(userId);

            if (configDB.auth !== undefined) {
                // svuota le collezioni "problems" e "goals" e "improvements_solutions"(?) dell'utente se le credenziali sono cambiate
                if (configDB.auth.url !== url && configDB.auth.token !== token) {
                    console.log("Le credenziali sono cambiate");
                    
                    const response_remove = await fetch(`/casper/remove_problems`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({'user_id': userId}),
                    });

                    if (!response_remove.ok) {
                        console.error('Error response:', await response_remove.text());
                    } else {
                        //printUserProblems([]); //svuota la carousel dei problems
                        printUserGoalProblems([]); //svuota la carousel delle goal problems
                    }
                }
            }

            if (!validateInputFields()) {
                return;
            }

            statusMessage.classList.remove('error');

            const response = await fetch(`/casper/load_devices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'userId': userId, 'url': url, 'token': token }),
            });

            if (!response.ok) {
                console.error('Error response:', await response.text());
                // Ripristina il pulsante in caso di errore
                loadButton.innerHTML = 'Carica Configurazione';
                loadButton.disabled = false;
                throw new Error('errore nel caricamento della configurazione');
            }

            const devices = await response.json();
            //console.log("devices from /casper/load_devices", devices);
            /* ------------- Saves automations -------------*/
            const response2 = await fetch(`/casper/load_automations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'userId': userId, 'url': url, 'token': token }),
            });
            //console.log("carico le automazioni")
            if (!response2.ok) {
                // Ripristina il pulsante in caso di errore
                loadButton.innerHTML = 'Carica Configurazione';
                loadButton.disabled = false;
                throw new Error('errore nel caricamento delle automazioni. Controlla se l\'URL Home Assistant e il Token di Accesso sono corretti.');
            }

            const rulesList = await response2.json();
            if (configDB.auth !== undefined) {
                if(configDB.auth.url !== url && configDB.auth.token !== token) {
                    // rileva problemi della nuova configurazione
                    const sessionId = Cookies.get('chat_session_id'); // Recupera la sessione corrente
                    const automations = 'all_rules'; 
                    const problems = await detectProblems(userId, sessionId, automations);

                    if (problems && problems.result) {
                        let problemsList = await getProblems()
                        problemsList = problemsList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
                        printUserProblems(problemsList);
                        let problemsGoalList = await getProblemGoal()
                        problemsGoalList = problemsGoalList.filter(problem => !problem.ignore && !problem.solved && problem.state != "off");
                        printUserGoalProblems(problemsGoalList);
                    }
                }
            }

            /* ------------- Saves logbook -------------*/
            const response_logbook = await fetch(`/casper/load_logbook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({'url': url, 'token': token }),
            });
            if (!response_logbook.ok) {
                throw new Error('Errore nel caricamento del logbook');
            }

            let logbook = await response_logbook.json();

            if (logbook !== null && logbook.length > 0) {
                await checkNotRunningAutomations(logbook, userId);
                await checkRunningAutomations(logbook, userId);
            }

            displayDevices(devices);
            printUserRule(rulesList);

            // Ripristina le selezioni precedenti dopo il nuovo caricamento
            const { selected: selectedDevices = [] } = await fetchConfig(userId);

            selectedDevices.forEach(deviceId => {
                const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId}"]`);
                if (checkbox) checkbox.checked = true;
            });

            // Raggruppa i dispositivi per stanza
            const groupedDevices = groupDevicesByRoom(savedDevices || []);

            // Controlla se tutte le checkbox di una stanza sono selezionate
            Object.entries(groupedDevices).forEach(([room, roomDevices]) => {
                    // Trova il contenitore della stanza corrente
                    const roomCard = Array.from(document.querySelectorAll('.room-card-config')).find(card => {
                        const roomNameElement = card.querySelector('.room-name');
                        return roomNameElement && roomNameElement.textContent.trim() === room;
                    });

                    if (!roomCard) return;

                    // Trova i checkbox dei dispositivi solo all'interno della stanza corrente
                    const roomCheckboxes = roomDevices.map(device => 
                        roomCard.querySelector(`.device-checkbox[data-device-id="${device.e}"]`)
                    );

                    // Controlla se tutti i checkbox della stanza sono selezionati
                    const allChecked = roomCheckboxes.every(checkbox => checkbox && checkbox.checked);
                    const selectAllCheckbox = roomCard.querySelector(`.select-all-checkbox`);
                    if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
                });
            
            statusMessage.classList.remove('error');
            // Ripristina il pulsante in caso di errore
            loadButton.innerHTML = 'Carica Configurazione';
            loadButton.disabled = false;       
            
        } catch (error) {
            console.error('Errore generale:', error);
            generateDialog("error", "Errore di caricamento", 
                `Si è verificato un errore: ${error.message}`, 
                () => {}
            );
            devicesList.classList.add('hidden');
        } finally {
            loadButton.disabled = false;
            loadButton.innerHTML = 'Carica Configurazione';
        }
    });
    
});

function getIcon(room) {
    const text = room.toLowerCase();
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
    if (text.includes("soggiorno") || text.includes("living")) {
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
    if (text.includes("entrata") || text.includes("entrance")) {
        return "🚪";
    }
    if (text.includes("sala") || text.includes("dining")) {
        return "🍽️";
    }
    if (text.includes("lavanderia") || text.includes("laundry")) {
        return "🧺";
    }
    if (text.includes("taverna") || text.includes("basement")) {
        return "🍻";
    }
    if (text.includes("ripostiglio") || text.includes("closet")) {
        return "🧹";
    }
    if (text.includes("palestra") || text.includes("gym")) {
        return "🏋️‍♂️";
    }
    if (text.includes("sala giochi") || text.includes("playroom")) {
        return "🎮";
    }
    if (text.includes("biblioteca") || text.includes("library")) {
        return "📚";
    }
    if (text.includes("sala cinema") || text.includes("home theater")) {
        return "🎬";
    }
    if (text.includes("soffitta") || text.includes("attic")) {
        return "📦";
    }
    return "🏠"; // Default room icon
}

async function checkNotRunningAutomations(logbook, userId) {
    //recupera le automazioni in esecuzione dal db dalla collezione rules_state
    const response_automations = await fetch(`/casper/load_automations_running`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'user_id': userId}),
    });
    if (!response_automations.ok) {
        console.error('Errore nel recupero delle automazioni running');
    } 
    const running_automations = await response_automations.json();
    //console.log("running automations", running_automations);
    // Controlla se le automazioni in esecuzione sono ancora attive
    running_automations.forEach(async (automation) => {
        //console.log("automazione in esecuzione", automation);
        logbook.forEach(async (element, index) => {
            if (element.entity_id === automation.entity_id_device) {
                if(element.state != automation.state_device) {
                    console.log(`Automazione ${element.entity_id} non è più in esecuzione`);
                    const updateResponse = await fetch('/casper/update_automation_state', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: userId,
                            entity_id: automation.entity_id,
                            is_running: false
                        })
                    });
                    
                    if (!updateResponse.ok) {
                        console.error('Errore nell\'aggiornamento dello stato automazione:', automation.entity_id);
                    }
                }
            }
        });
    });
}

async function checkRunningAutomations(logbook, userId) {
    // Controlla se le automazioni sono state attivate
    logbook.forEach(async (element, index) => {
        if (element.entity_id && element.entity_id.startsWith('automation.') && element.message && element.message.startsWith('triggered')) {
            //console.log(`Automazione ${index}:`, element);
            let shouldAddToDb = true;
            if (index + 1 < logbook.length) {
                activatedDeviceName = logbook[index+1].entity_id;
                activatedDeviceState = logbook[index + 1].state;
                if(logbook[index+1].context_event_type == "automation_triggered"){
                    //console.log("Dispositivo: ", activatedDeviceName, "Stato: ", activatedDeviceState);
                    if(index + 2 < logbook.length){
                        for (let j = index + 2; j < logbook.length; j++) {
                            if (logbook[j].entity_id === activatedDeviceName) {
                                newactivatedDeviceState = logbook[j].state;
                                //console.log("Nuovo stato del dispositivo attivato:", newactivatedDeviceState);
                                if (newactivatedDeviceState !== activatedDeviceState) {
                                    console.log("NON SI AGGIUNGE", element.entity_id)
                                    shouldAddToDb = false;
                                    break
                                }
                            
                            }
                        }
                        
                    }
                    if (shouldAddToDb) {
                        console.log("AGGIUNGERE AL DB", element.entity_id);
                        // Aggiorna lo stato dell'automazione nel database
                        try {
                            const updateResponse = await fetch('/casper/update_automation_state', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    userId: userId,
                                    entity_id: element.entity_id,
                                    is_running: true, 
                                    entity_id_device: activatedDeviceName,
                                    state_device: activatedDeviceState,
                                })
                            });
                            
                            if (!updateResponse.ok) {
                                console.error('Errore nell\'aggiornamento dello stato automazione:', element.entity_id);
                            }
                        } catch (error) {
                            console.error('Errore nella chiamata di aggiornamento:', error);
                        }

                    }
                }
            }
        }
    });
}