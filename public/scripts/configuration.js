const tokenRaw = Cookies.get("auth-token");
const chat_session_id = Cookies.get("chat_session_id");
const token = jwt_decode(tokenRaw);
const userId = token.id;


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
        try {
            const url = urlInput.value.trim().replace(/\/+$/, '');
            const token = tokenInput.value.trim();
            
            if (!url || !token) {
                throw new Error('Compilare tutti i campi');
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

            const devices = await response.json();
            let logbook = await response_logbook.json();
            // Filtra gli elementi del logbook che sono automazioni
            /*const automationLogs = logbook.filter(entry => 
                entry.entity_id && entry.entity_id.startsWith('automation.') && entry.message && entry.message.startsWith('triggered')
            );*/
            //console.log(logbook)
            
            logbook = [
                {state: 'on', entity_id: 'binary_sensor.shellymotion2_2c1165cb13df_motion', name: 'Sensore movimento Motion', when: '2025-07-15T15:30:51.266495+00:00'},
                {name: 'Accendi luce bagno', message: 'triggered by state of binary_sensor.shellymotion2_2c1165cb13df_motion', source: 'state of binary_sensor.shellymotion2_2c1165cb13df_motion', entity_id: 'automation.accendi_luce_bagno', context_id: '01K07BBJ83G29HVB8KF6HPPZC0'},
                {state: 'on', entity_id: 'light.shellycolorbulb_3494546e408a', name: 'Luce bagno', when: '2025-07-15T15:30:51.301942+00:00', context_event_type: 'automation_triggered'},
                {state: 'off', entity_id: 'binary_sensor.shellymotion2_2c1165cb13df_motion', name: 'Sensore movimento Motion', when: '2025-07-15T15:36:02.875112+00:00'},
                {name: 'Spegni luce bagno', message: 'triggered by state of binary_sensor.shellymotion2_2c1165cb13df_motion', source: 'state of binary_sensor.shellymotion2_2c1165cb13df_motion', entity_id: 'automation.spegni_luce_bagno', context_id: '01K07BN2HW694AC30E7B4D3FHR'},
                {state: 'off', entity_id: 'light.shellycolorbulb_3494546e408a', name: 'Luce bagno', when: '2025-07-15T15:36:02.906163+00:00', context_event_type: 'automation_triggered'}
            ];/*
            logbook = [
                {name: 'Spegni luce bagno', message: 'triggered by state of binary_sensor.shellymotion2_2c1165cb13df_motion', source: 'state of binary_sensor.shellymotion2_2c1165cb13df_motion', entity_id: 'automation.spegni_luce_bagno', context_id: '01K07BN2HW694AC30E7B4D3FHR'},
                {state: 'off', entity_id: 'light.shellycolorbulb_3494546e408a', name: 'Luce bagno', when: '2025-07-15T15:36:02.906163+00:00', context_event_type: 'automation_triggered'},
                {name: 'Accendi luce bagno', message: 'triggered by state of binary_sensor.shellymotion2_2c1165cb13df_motion', source: 'state of binary_sensor.shellymotion2_2c1165cb13df_motion', entity_id: 'automation.accendi_luce_bagno', context_id: '01K07BBJ83G29HVB8KF6HPPZC0'},
                {state: 'on', entity_id: 'light.shellycolorbulb_3494546e408a', name: 'Luce bagno', when: '2025-07-15T15:30:51.301942+00:00', context_event_type: 'automation_triggered'}
               */
            if (logbook !== null && logbook.length > 0) {
                logbook.forEach((element, index) => {
                    if (element.entity_id && element.entity_id.startsWith('automation.') && element.message && element.message.startsWith('triggered')) {
                        console.log(`Automazione ${index}:`, element);
                        let shouldAddToDb = true;
                        if (index + 1 < logbook.length) {
                            activatedDeviceName = logbook[index+1].entity_id;
                            activatedDeviceState = logbook[index + 1].state;
                            if(logbook[index+1].context_event_type == "automation_triggered"){
                                console.log("Dispositivo: ", activatedDeviceName, "Stato: ", activatedDeviceState);
                                if(index + 2 < logbook.length){
                                    for (let j = index + 2; j < logbook.length; j++) {
                                        if (logbook[j].entity_id === activatedDeviceName) {
                                            newactivatedDeviceState = logbook[j].state;
                                            console.log("Nuovo stato del dispositivo attivato:", newactivatedDeviceState);
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
                                }
                            }
                        }
                    }
                });
            }
            //TODO: a riga 208, imposta come attiva l'automazione.
            //considera il caso in cui 2 automazioni attivano lo stesso dispositivo: si attiva la prima attivazione (la seconda non ha il dispositivo subito dopo perchè è già attivo) --> è giusto??
            //nella collezione inserire anche l'entityid del dispositivo attivato e il suo stato (on/off) al momento dell'attivazione dell'automazione
            // Salva tutti i devices nel localStorage
            localStorage.setItem('all_devices', JSON.stringify(devices));
            displayDevices(devices);
            

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
            /* ------------- --------------- -------------*/


            // Ripristina le selezioni precedenti dopo il nuovo caricamento
            const selectedDevices = JSON.parse(localStorage.getItem('selected_devices') || '[]');
            selectedDevices.forEach(deviceId => {
                const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId}"]`);
                if (checkbox) checkbox.checked = true;
            });
            
            statusMessage.textContent = 'Dispositivi caricati con successo!';
            
        } catch (error) {
            statusMessage.textContent = `Errore: ${error.message}`;
            statusMessage.classList.add('error');
            devicesList.classList.add('hidden');
        } finally {
            loadButton.disabled = false;
            loadButton.querySelector('.spinner').classList.add('hidden');
        }
    });
});