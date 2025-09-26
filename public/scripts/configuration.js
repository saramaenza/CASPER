//const tokenRaw = Cookies.get("auth-token");
//const chat_session_id = Cookies.get("chat_session_id");
//const token = jwt_decode(tokenRaw);
//const userId = token.id;


document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('home-assistant-url');
    const tokenInput = document.getElementById('home-assistant-token');
    const loadButton = document.getElementById('load-devices');
    const statusMessage = document.getElementById('status-message');
    const devicesList = document.getElementById('devices-list');

    // Carica credenziali salvate
    const savedUrl = localStorage.getItem('ha_url');
    const savedToken = localStorage.getItem('ha_token');
    const savedDevices = JSON.parse(localStorage.getItem('all_devices') || 'null');
    const selectedDevices = JSON.parse(localStorage.getItem('selected_devices') || '[]');
    
    if (savedUrl) urlInput.value = savedUrl;
    if (savedToken) tokenInput.value = savedToken;
    if (savedDevices) {
        displayDevices(savedDevices);
        // Ripristina le selezioni precedenti
        selectedDevices.forEach(deviceId => {
            console.log(deviceId);
            const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

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
        }
        
        // Controlla se il token è vuoto
        if (!tokenInput.value.trim()) {
            tokenInput.classList.add('error');
            errorMessage += 'Il campo Token di Accesso è obbligatorio. ';
            isValid = false;
        }
        
        // Validazione formato URL (opzionale)
        if (urlInput.value.trim() && !isValidUrl(urlInput.value.trim())) {
            urlInput.classList.add('error');
            errorMessage += 'Inserisci un URL valido. ';
            isValid = false;
        }
        
        // Mostra messaggio di errore se ci sono problemi
        if (!isValid) {
            showStatusMessage(errorMessage.trim(), 'error');
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
    style.textContent = `
        .config-input.error {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
        }
    `;
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

    function displayDevices(devices) {
        devicesList.innerHTML = '';
        const groupedDevices = groupDevicesByRoom(devices);
        
        // Aggiungi bottone salva
        const saveButton = document.createElement('button');
        saveButton.id = 'save-selection';
        saveButton.textContent = 'Salva selezione';
        saveButton.classList.add('button');
        devicesList.appendChild(saveButton);
        Object.entries(groupedDevices).forEach(([room, roomDevices]) => {
            const roomDiv = document.createElement('div');
            roomDiv.classList.add('room-group');
            
            const roomHeader = document.createElement('h3');
            roomHeader.textContent = room;
            roomDiv.appendChild(roomHeader);

            const deviceList = document.createElement('ul');
            deviceList.classList.add('device-list');

            roomDevices.forEach(device => {
                const li = document.createElement('li');
                li.classList.add('device-item');
                li.innerHTML = `
                    <input type="checkbox" class="device-checkbox" data-device-id="${device.e}">
                    <strong>${device.f}</strong>
                    <span class="device-name">${device.df}</span>
                    <span class="device-desc">${device.desc}</span>
                    <span class="entity-id">${device.e}</span>
                `;
                
                // Aggiungi click handler per tutta la riga
                li.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        const checkbox = li.querySelector('.device-checkbox');
                        checkbox.checked = !checkbox.checked;
                    }
                });
                
                deviceList.appendChild(li);
            });

            roomDiv.appendChild(deviceList);
            devicesList.appendChild(roomDiv);
        });

        
        devicesList.classList.remove('hidden');

        // Aggiungi event listener per il bottone salva
        saveButton.addEventListener('click', async () => {
            const selectedDevices = Array.from(document.querySelectorAll('.device-checkbox:checked'))
                .map(checkbox => checkbox.dataset.deviceId);
            
            // Salva in localStorage o invia al server
            localStorage.setItem('selected_devices', JSON.stringify(selectedDevices));
            console.log(selectedDevices)
            const response = await fetch(`/save_config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'userId': userId, 'devices': selectedDevices }),
            });

            if (!response.ok) {
                statusMessage.textContent = 'Errore nel salvataggio della selezione';
                throw new Error('Errore nel salvataggio dei dispositivi');
            }else{
                statusMessage.textContent = 'Selezione salvata!';
                statusMessage.classList.remove('error');
            }
            statusMessage.classList.remove('hidden');
        });
    }

    loadButton.addEventListener('click', async () => {
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

            loadButton.disabled = true;
            loadButton.querySelector('.spinner').classList.remove('hidden');
            statusMessage.textContent = 'Caricamento dispositivi...';
            statusMessage.classList.remove('hidden');
            statusMessage.classList.remove('error');

            localStorage.setItem('ha_url', url);
            localStorage.setItem('ha_token', token);

            const response = await fetch(`/load_devices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'userId': userId, 'url': url, 'token': token }),
            });

            if (!response.ok) {
                throw new Error('Errore nel caricamento dei dispositivi');
            }

            const devices = await response.json();

            /* ------------- Saves automations -------------*/
            const response2 = await fetch(`/load_automations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'userId': userId, 'url': url, 'token': token }),
            });
            console.log("carico le automazioni")
            if (!response2.ok) {
                throw new Error('Errore nel caricamento delle automazioni');
            }

            /* ------------- Saves logbook -------------*/
            const response_logbook = await fetch(`/load_logbook`, {
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
            
            /* ------------- Saves default goal ranking -------------*/
            // controlla se esistono già le preferenze per l'utente
            const checkPreferences = await fetch(`/get_user_preferences?user_id=${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const preferencesExist = await checkPreferences.json();
            if (preferencesExist.ranking == undefined) {
                
                const defaultRanking = [
                    {id: 'sicurezza', position: 1, name: 'Sicurezza', icon: '🛡️'},
                    {id: 'salute', position: 2, name: 'Salute', icon: '❤️'},
                    {id: 'energia', position: 3, name: 'Energia', icon: '🔋'},
                    {id: 'benessere', position: 4, name: 'Benessere', icon: '🌱'}
                ];
                const response_preferences = await fetch(`/save_user_preferences`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({'user_id': userId, 'ranking': defaultRanking }),
                });
            
                if (!response_preferences.ok) {
                    throw new Error('Errore nel salvataggio delle preferenze di default');
                } 

                await fetch('/get_goal_improvements', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: userId })
                });
            }

            // Salva tutti i devices nel localStorage
            localStorage.setItem('all_devices', JSON.stringify(devices));
            displayDevices(devices);

            // Ripristina le selezioni precedenti dopo il nuovo caricamento
            const selectedDevices = JSON.parse(localStorage.getItem('selected_devices') || '[]');
            selectedDevices.forEach(deviceId => {
                const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId}"]`);
                if (checkbox) checkbox.checked = true;
            });
            
            statusMessage.textContent = 'Dispositivi caricati con successo!';
            statusMessage.classList.remove('error');
            
        } catch (error) {
            generateDialog("error", "Errore di caricamento", `Si è verificato un errore: ${error.message}`, () => {});
            devicesList.classList.add('hidden');
        } finally {
            loadButton.disabled = false;
            const spinner = loadButton.querySelector('.spinner');
            if (spinner) {
                spinner.classList.add('hidden');
            }
        }
    });
});

async function checkNotRunningAutomations(logbook, userId) {
    //recupera le automazioni in esecuzione dal db dalla collezione rules_state
    const response_automations = await fetch(`/load_automations_running`, {
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
    console.log("running automations", running_automations);
    // Controlla se le automazioni in esecuzione sono ancora attive
    running_automations.forEach(async (automation) => {
        console.log("automazione in esecuzione", automation);
        logbook.forEach(async (element, index) => {
            if (element.entity_id === automation.entity_id_device) {
                if(element.state != automation.state_device) {
                    console.log(`Automazione ${element.entity_id} non è più in esecuzione`);
                    const updateResponse = await fetch('/update_automation_state', {
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
                            const updateResponse = await fetch('/update_automation_state', {
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