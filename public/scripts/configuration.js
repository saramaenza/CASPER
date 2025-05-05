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
            const url = urlInput.value.trim();
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

            const devices = await response.json();
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