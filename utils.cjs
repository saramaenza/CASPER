const { response } = require('express');
const { toggleAutomation: toggleAutomationDB } = require('./db_methods.cjs');
const fetch = require('node-fetch'); 
const python_server = "http://127.0.0.1:8080"

//Funzione per ottenere la lista delle entità con le relative descrizioni.
async function getEntities(baseUrl, token) {
    // Prima testa la connessione
    const connectionTest = await testHomeAssistantConnection(baseUrl, token);
    if (!connectionTest) {
        console.error('Connessione a Home Assistant fallita. Verifica URL e token.');
        return null;
    }
    const url = `${baseUrl}/api/template`;
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    const template = [
           "{% set entities = states | map(attribute='entity_id') | list %}",
        "{% set ns = namespace(entities_list = []) %}",
        "{% for entity in entities %}",
        "{% set state = states[entity] %}",
        "{% set attrs = state.attributes %}",
        "{% set area = area_name(entity) or 'Nessuna' %}",
        "{% set friendly_name = attrs.friendly_name or 'Sconosciuto' %}",
        "{% set domain = entity.split('.')[0] %}",
        "{% set device_name = device_attr(entity, 'name') or 'Nessuno' %}",
        "{% set device_friendly = device_attr(entity, 'name_by_user') or device_name %}",
        "{% if area != 'Nessuna' and not entity.startswith('automation') %}",
        "{% set description = friendly_name + ' in ' + area + ' (' + domain + ')' %}",
        "{% set ns.entities_list = ns.entities_list + [{",
        "  'e': entity,",
        "  'f': friendly_name,",
        "  'a': area,",
        "  't': domain,",
        "  'd': device_name,",
        "  'df': device_friendly,",
        "  'dc': attrs.device_class if 'device_class' in attrs else None,",
        "  'desc': description,",
        "  'unit': 'ppm (Co2)' if 'unit_of_measurement' in attrs and attrs.unit_of_measurement == 'ppm' else attrs.unit_of_measurement if 'unit_of_measurement' in attrs and attrs.unit_of_measurement else None,",
        "  'options': attrs.options if 'options' in attrs and attrs.options|length else None,",
        "  'mode': attrs.preset_modes if 'preset_modes' in attrs and attrs.preset_modes|length else None,",
        "  'effects': attrs.effect_list if 'effect_list' in attrs and attrs.effect_list|length else None,",
        "  'colors': attrs.supported_color_modes if 'supported_color_modes' in attrs and attrs.supported_color_modes|length else None,",
        "  'min': attrs.min if 'min' in attrs else None,",
        "  'max': attrs.max if 'max' in attrs else None,",
        "}] %}",
        "{% endif %}",
        "{% endfor %}",
        "{{ ns.entities_list | to_json }}"
    ].join("");

    const data = {
        template: template
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const entities = await response.json();
            return entities;
        } else {
            if (response.status === 401) {
                console.error(`Token Home Assistant non valido o scaduto. Verifica le credenziali.`);
            } else {
                console.error(`Errore nella richiesta per recuperare i device in Home assistant: ${response.status}`);
            }
            return null;
        }
    } catch (error) {
        console.error("Errore decodifica JSON, utils.js:", error);
        return null;
    }
}


sanitizeDescription = async (description) => {
    if (description.includes("Evento:")) {
        //console.log("Descrizione già sanitizzata, nessuna chiamata al server Python necessaria.");
        return [description, false];
    }

    try {
        const response = await fetch(`${python_server}/sanitize_description`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description }),
        });

        if (!response.ok) {
            console.error('Errore nella sanitizzazione della descrizione:', response.status);
            return [description, false];
        }
        const data = await response.json();

        return [data.sanitized_description, true];
    } catch (error) {
        console.error('Errore durante la chiamata alla route /sanitize_description:', error);
        return [description, false];
    }
};

async function getAutomationsHA(baseUrl, token) {
    // Prima testa la connessione
    const connectionTest = await testHomeAssistantConnection(baseUrl, token);
    if (!connectionTest) {
        console.error('Connessione a Home Assistant fallita per le automazioni. Verifica URL e token.');
        return null;
    }
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    try {
        // Recupera tutti gli stati
        const statesResponse = await fetch(`${baseUrl}/api/states`, {
            headers: headers
        });

        if (!statesResponse.ok) {
            if (statesResponse.status === 401) {
                console.error('Token Home Assistant non valido per il recupero degli stati delle automazioni');
            } else {
                console.error(`Errore nel recupero degli stati: ${statesResponse.status}`);
            }
            return null;
        }

        const states = await statesResponse.json();
        
        // Filtra per automazioni
        const automations = states.filter(state => state.entity_id.startsWith('automation.'));

        // Recupera la configurazione per ogni automazione
        const automationConfigs = await Promise.all(
            automations.map(async (automation) => {
                const automationState = automation.state;
                const automationId = automation.attributes.id;
                const automationEntityId = automation.entity_id;
                if (!automationId) return null;

                const configResponse = await fetch(
                    `${baseUrl}/api/config/automation/config/${automationId}`,
                    { headers: headers }
                );

                if (!configResponse.ok) {
                    console.error(`Errore nel recupero della configurazione per l'automazione ${automationId}: ${configResponse.status}`);
                    return null;
                }

                const config = await configResponse.json();

                let description = config.description || "Nessuna descrizione disponibile";

                let result = await sanitizeDescription(description);
                let newDescription = result[0];
                let isUpdated = result[1];

                if (isUpdated) {
                    config.description = newDescription;
                    // Aggiorna la configurazione dell'automazione in Home Assistant
                    const updateSuccess = await postAutomationHA(baseUrl, token, automationId, config);
                    if (!updateSuccess) {
                        console.error(`Errore durante l'aggiornamento della configurazione dell'automazione ${automationId} in Home Assistant.`);
                    }
                }

                return {
                    id: automationId,
                    state: automationState,
                    config: config,
                    entity_id: automationEntityId
                };
            })
        );

        return automationConfigs.filter(config => config !== null);
    } catch (error) {
        console.error("Errore nel recupero delle automazioni:", error);
        return null;
    }
}

async function postAutomationHA(baseUrl, token, automationId, configData) {

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await fetch(
            `${baseUrl}/api/config/automation/config/${automationId}`, 
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(configData)
            }
        );

        if (!response.ok) {
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Errore durante il salvataggio dell'automazione:`, error);
        return false;
    }
}

async function getLogbook(baseUrl, token) {
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    }

    try {
        timestamp = new Date(Date.now() - 10 * 60 * 1000);  
        timestamp = timestamp.toISOString();  // Converti in formato ISO 8601
        //console.log("Timestamp per il logbook:", timestamp);
        
        const response = await fetch(`${baseUrl}/api/logbook/${timestamp}`, {
            headers: headers
        });

        if (!response.ok) {
            console.error(`Errore nel recupero del logbook: ${response.status}`);
            return null;
        }

        const logbook = await response.json();
        return logbook;
    } catch (error) {
        console.error(`Errore durante il recupero del logbook:`, error);
        return null;
    }
}

async function testHomeAssistantConnection(baseUrl, token) {
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    
    try {
        const response = await fetch(`${baseUrl}/api/`, {
            headers: headers
        });
        
        if (!response.ok) {
            console.error(`Test connessione fallito: ${response.status}`);
            if (response.status === 401) {
                console.error('Token non valido o scaduto');
            }
            return false;
        }
        
        const data = await response.json();
        //console.log(`Connessione a Home Assistant riuscita. Versione: ${data.version}`);
        return true;
    } catch (error) {
        console.error(`Errore nel test di connessione:`, error);
        return false;
    }
}

async function getEntitiesStates(baseUrl, token, conf) {
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    
    try {
        // Recupera tutti gli stati
        const statesResponse = await fetch(`${baseUrl}/api/states`, {
            headers: headers
        });

        if (!statesResponse.ok) {
            const errorText = await statesResponse.text();
            console.error(`Errore nel recupero degli stati: ${statesResponse.status} - ${errorText}`);
            return null;
        }

        // Controlla il content-type prima di fare il parsing JSON
        const contentType = statesResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await statesResponse.text();
            console.error(`Risposta non JSON ricevuta: ${responseText}`);
            return null;
        }

        let states;
        try {
            states = await statesResponse.json();
        } catch (jsonError) {
            const responseText = await statesResponse.text();
            console.error(`Errore nel parsing JSON: ${jsonError.message}`);
            console.error(`Contenuto della risposta: ${responseText}`);
            return null;
        }

        // Filtra gli stati in base alla configurazione
        states = states.filter(state => {
            const entityId = state.entity_id;
            return conf.selected.some(selected => selected.e === entityId);
        });
        //console.log("Fitlered States:", states);
        
        return states;
       
    } catch (error) {
        console.error(`Errore durante il recupero degli stati:`, error);
        return null;
    }
}

async function toggleAutomation(baseUrl, token, automationId, automationEntityId, userId) {
    const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
     try {

        const entityId = automationEntityId.startsWith('automation.') ? automationEntityId : `automation.${automationEntityId}`;
        const response = await fetch(
            `${baseUrl}/api/services/automation/toggle`, 
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    "entity_id": entityId
                })
            }
        );
        if (!response.ok) {
            console.error(`Errore nel toggle dell'automazione ID:${automationId}: ${response.json()}:`);
            return false;
        }
        let final_response = await response.json();
        
        if (!final_response || final_response==[] || !final_response[0].state) {
            console.error(`Risposta non valida dal server per l'automazione ID:${automationId}, ${response.json()}`);
            return false;
        }
        let state = final_response[0].state;
        toggleAutomationDB(userId, automationId, state);
        return state;
    } catch (error) {
        console.error(`Errore durante il toogle dell'automazione. Response: ${response.json()}`, error);
        return false;
    }
}

async function deleteAutomation(baseUrl, token, automationId) {
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    try {
        if (typeof automationId !== 'string') {
            automationId = String(automationId);
        }

        const response = await fetch(
            `${baseUrl}/api/config/automation/config/${automationId}`, 
            {
                method: 'DELETE',
                headers: headers
            }
        );
        if (!response.ok) {
            console.error(`Errore nella cancellazione dell'automazione ${automationId}: ${response.status}`);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`Errore durante la cancellazione dell'automazione:`, error);
        return false;
    }
}

module.exports = { getEntities, getAutomationsHA, postAutomationHA, getLogbook, toggleAutomation, getEntitiesStates, testHomeAssistantConnection, deleteAutomation };