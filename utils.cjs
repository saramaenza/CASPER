//Funzione per ottenere la lista delle entità con le relative descrizioni.
async function getEntities(baseUrl, token) {
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
        "  'unit': 'ppm (CO2)' if 'unit_of_measurement' in attrs and attrs.unit_of_measurement == 'ppm' else attrs.unit_of_measurement if 'unit_of_measurement' in attrs and attrs.unit_of_measurement else None,",
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
            console.error(`Errore nella richiesta per recuperare i device in Home assistant, utils.js: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error("Errore decodifica JSON, utils.js:", error);
        return null;
    }
}

async function getAutomationsHA(baseUrl, token) {
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
            console.error(`Errore nel recupero degli stati: ${statesResponse.status}`);
            return null;
        }

        const states = await statesResponse.json();
        
        // Filtra per automazioni
        const automations = states.filter(state => state.entity_id.startsWith('automation.'));

        // Recupera la configurazione per ogni automazione
        const automationConfigs = await Promise.all(
            automations.map(async (automation) => {
                const automationId = automation.attributes.id;
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
                return {
                    id: automationId,
                    config: config
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
    console.log(`Salvataggio dell'automazione su Home Assistant ${automationId} in corso...`);
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
        console.log(`Risposta dal server: ${response}`);
        if (!response.ok) {
            console.error(`Errore nell'aggiornamento dell'automazione ${automationId}: ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Errore durante il salvataggio dell'automazione:`, error);
        return false;
    }
}

module.exports = { getEntities, getAutomationsHA, postAutomationHA };