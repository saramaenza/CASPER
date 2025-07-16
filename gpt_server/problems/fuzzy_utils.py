import re
from collections import defaultdict
import numpy as np
import requests

# Funzione di supporto per ottenere i dati
def getData(area, var_name, environmentVariables, ha_client):
    realDataVariable = getRealDataVariable(area, var_name, environmentVariables or {}, ha_client)
    #print(f"realDataVariable for {var_name}: {realDataVariable}")
    return realDataVariable

def getRealDataVariable(area, variable, environmentVariables, ha_client):
    for item in environmentVariables.values():
        homeNames = ["home", "casa"]
        if (item.get('room') == area and item.get('class') == variable) or (item.get('room') == area and item.get('name').lower().strip() in variable) or (item.get('room').lower() in homeNames and item.get('name').lower().strip() in variable) or (item.get('room').lower() in homeNames and item.get('class') == variable):
            entity_id = item.get('entity_id')
            base_url = ha_client.base_url
            auth_header = ha_client.headers.get('Authorization', '')
            token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
            state = get_entity_state_from_ha(entity_id, base_url, token)
            #print(f"State for {item.get('name', '')} in area {area}: {state}")
            if state is not None:
                return state.lower()

def get_entity_state_from_ha(entity_id, base_url, token):
    """
    Recupera lo stato attuale dell'entità da Home Assistant
    """
    url = f"{base_url}/api/states/{entity_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers, timeout=5)
    
    if response.status_code == 200:
        data = response.json()
        state_value = data.get('state')
        
        if state_value:
            try:
                return state_value
            except ValueError:
                return state_value
        else:
            return None
    else:
        return None

    
def transform_rule_to_array(expression):
    expression = str(expression)
    # Rimuove tutte le parentesi e gli operatori AND e OR
    cleaned_expression = re.sub(r'[\(\)]', '', expression)
    cleaned_expression = re.sub(r'\s+(AND|OR)\s+', ' ', cleaned_expression)
    
    # Divide l'espressione in singoli elementi
    elements = cleaned_expression.split()

    prefix_count = defaultdict(int)

    for item in elements:
        prefix = item.split('[')[0]
        prefix_count[prefix] += 1

    # Filtrare l'array per mantenere solo gli elementi con prefissi non ripetuti
    cleaned_array = [item for item in elements if prefix_count[item.split('[')[0]] == 1]
    
    return cleaned_array


# Definiamo la funzione per convertire la regola in linguaggio naturale
def rule_to_natural_language(rule):
    antecedent_terms = transform_rule_to_array(rule.antecedent)
    texts = []
    
    for i, antecedent_term in enumerate(antecedent_terms):
        term_attribute = f"term{i+1}"
        antecedent = getattr(rule.antecedent, term_attribute, rule.antecedent)
        
        mf_values = antecedent.mf
        universe = antecedent.parent.universe
        indices = np.where(mf_values > 0)[0]
        mf_range = universe[indices]
        mf_min, mf_max = np.min(mf_range), np.max(mf_range)
        
        variable = str(antecedent).split('[')[0]
        
        if variable == "season":
            #season_map = {0: "winter", 1: "spring", 2: "summer", 3: "autumn"}
            season_map = {0: "inverno", 1: "primavera", 2: "estate", 3: "autunno"}
            #texts.append(f"it is {season_map.get(int(mf_min), 'unknown season')}")
            texts.append(f"è <b>{season_map.get(int(mf_min), 'stagione sconosciuta')}</b>")
        elif variable == "time_of_day":
            if (mf_min == 6 and mf_max == 11):
                #texts.append(f"it is morning")
                texts.append(f"<b>è mattina</b>")
            if (mf_min == 12 and mf_max == 17):
                #texts.append(f"it is afternoon")
                texts.append(f"<b>è pomeriggio</b>")
            if (mf_min == 18 and mf_max == 23):
                #texts.append(f"it is evening")
                texts.append(f"<b>è sera</b>")
            if (mf_min == 0 and mf_max == 5):
                #texts.append(f"it is night")
                texts.append(f"<b>è notte</b>")
        else:
            unit = {"temperature": "°", "humidity": "%", "sound_pressure": "db", "illuminance": "lx", "co2_level": "ppm", "energy": "kWh"}.get(variable, "")
            name_variable = variable.replace('_', ' ')
            #if(name_variable == "aqi"):
                #name_variable = "air quality index"

            if (name_variable == "temperature"):
                name_variable = "la temperatura"
            if (name_variable == "humidity"):
                name_variable = "l'umidità"
            if (name_variable == "sound pressure"):
                name_variable = "il rumore"
            if (name_variable == "illuminance"):
                name_variable = "l'illuminazione"
            if (name_variable == "aqi"):
                name_variable = "l'indice qualità dell'aria"
            if (name_variable == "co2 level"):
                name_variable = "il livello di co2"
            if (name_variable == "energy"):
                name_variable = "l'energia"
            #texts.append(f"{name_variable} is between {mf_min}{unit} and {mf_max}{unit}")
            texts.append(f"<b>{name_variable}</b> è tra <b>{mf_min}{unit}</b> e <b>{mf_max}{unit}</b>")
    
    #return " and ".join(texts)
    return " e ".join(texts)

def getSeason(input_date):
    day = input_date.day
    month = input_date.month
    
    # Determine the season based on the month and day
    if (month == 12 and day >= 21) or (1 <= month <= 2) or (month == 3 and day < 21):
        return 0    #winter
    elif (month == 3 and day >= 21) or (month == 4) or (month == 5) or (month == 6 and day < 21):
        return 1    #spring
    elif (month == 6 and day >= 21) or (month == 7) or (month == 8) or (month == 9 and day < 23):
        return 2    #summer
    elif (month == 9 and day >= 23) or (month == 10) or (month == 11) or (month == 12 and day < 21):
        return 3    #autumn
    
def evaluate_rules_old(control_system_simulation, rules_to_check):
    activated_rules = []
    for i, rule in enumerate(rules_to_check, start=1):
        # Evaluate the firing strength of the rule
        rule_firing = rule.aggregate_firing[control_system_simulation]
        if rule_firing > 0:
            activated_rules.append((i, rule_firing))
    return activated_rules


def evaluate_rules(control_system_simulation, rules_to_check):
    activated_rules = []
    max_rule_firing = float('-inf')  # Valore iniziale più basso possibile
    best_rule = None
    for i, rule in enumerate(rules_to_check, start=1):
        # Valuta la forza di attivazione della regola
        rule_firing = rule.aggregate_firing[control_system_simulation]
        if rule_firing > 0:
            # Aggiorna se la regola attuale ha un valore di rule_firing più alto
            if rule_firing > max_rule_firing:
                max_rule_firing = rule_firing
                best_rule = (i, rule_firing)

    if best_rule is not None:
        activated_rules.append(best_rule)

    return activated_rules


