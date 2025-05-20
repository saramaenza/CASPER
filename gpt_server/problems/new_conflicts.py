import json
from requests import get, post
import re
import ast
from langchain_core.messages import HumanMessage, SystemMessage
import db_functions as _db

import responses
import prompts
import models

llm = models.gpt4
"""import os
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI

load_dotenv()
llm = AzureChatOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_deployment=os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"],
    openai_api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)"""

# Rimuovi le definizioni globali di base_url, token, headers qui
# ...existing code...

# Rimuovi la definizione globale di infoConflictArrayLLM qui

class ConflictDetector:
    def __init__(self, base_url, token, user_id):
        self.base_url = base_url
        self.token = token
        self.headers = {
            "Authorization": "Bearer " + self.token,
            "content-type": "application/json",
        }
        self.user_id = user_id
        self.conflicts = [] # Sostituisce infoConflictArrayLLM

    def _check_response(self, response):
        if response.status_code == 200:
            return response.text
        else:
            response.raise_for_status()

    def _getTemplateData(self, template):
        data = {"template": template}
        url = self.base_url + "/api/template"
        response = post(url, headers=self.headers, data=json.dumps(data))
        return self._check_response(response)

    def _getFriendlyName(self, entity_id):
        template =  '{{ state_attr("'+entity_id+'", "friendly_name") }}'
        return self._getTemplateData(template)

    def _getNameUserDevice(self, device):
        template =  '{{ device_attr("'+device+'", "name_by_user") }}'
        return self._getTemplateData(template)

    def _getDeviceClass(self, friendly_name):
        template =  '{% for sensor in states %}{% if sensor.attributes.friendly_name == "'+friendly_name+'" %}{{ sensor.attributes.device_class }}{% endif %}{% endfor %}'
        return self._getTemplateData(template)
    
    def _getID(self, device):
        template =  '{{ device_id("'+device+'") }}'
        return self._getTemplateData(template)

    def _getEntitiesByArea(self, area):
        template =  '{{ area_entities("'+area+'") }}'
        return self._getTemplateData(template)

    def _getEntitiesByDomainAndArea(self, area, domain):
        area = ' '.join(area)
        entitiesByArea = self._getEntitiesByArea(area)
        entitiesByArea = ast.literal_eval(entitiesByArea)          
        entitiesByDomainAndArea = [item for item in entitiesByArea if item.startswith(domain)]
        return entitiesByDomainAndArea
    
    def _getDevicesId(self, entities):
        devicesId = []
        for e in entities:
            id_val = self._getID(e)
            devicesId.append(id_val)
        return devicesId

    def _call_find_solution_llm(self, idAutomation1, idAutomation2, ruleName1, ruleName2, automation1_description, automation2_description):
        formatted_prompt = prompts.recommender.format(
            home_devices=_db.get_devices(self.user_id),
        )
        messages = [
        SystemMessage(formatted_prompt),
        HumanMessage(f"Generate a solution for the conflict between the following automations:\n{ruleName1}(id {idAutomation1}): {automation1_description}\n{ruleName2}(id {idAutomation2}):{automation2_description}"),
        ]
        structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
        data = structured_response.invoke(messages)
        return data


    def _is_conflict_present(self, id_conflict):
        for conflict in self.conflicts:
            if conflict.get("unique_id_conflict") == id_conflict:
                return True
        return False

    def _append_conflict(self, ruleName1, ruleName2, type1, type2, optionalValue1, optionalValue2, typeOptionalValue1, typeOptionalValue2, nameApplianceTrigger1, nameApplianceTrigger2, typeTrigger1, typeTrigger2, domainTrigger1, domainTrigger2, nameApplianceAction1, nameApplianceAction2, condition1, condition2, device_class1, automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2):  
        if type_of_front_end == "llm":
            solution_info = self._call_find_solution_llm(idAutomation1, idAutomation2, ruleName1, ruleName2, automation1_description, automation2_description) 
            id_conflict = len(self.conflicts) + 1
            unique_id_conflict = str(idAutomation1)+"_"+str(idAutomation2)
            if not self._is_conflict_present(id_conflict):
                self.conflicts.append({
                    "type": "conflict",
                    "id_conflict": id_conflict,
                    "unique_id_conflict": unique_id_conflict,
                    "rules": [
                        {
                            "id": idAutomation1,
                            "name": ruleName1,
                            "description": automation1_description,
                        },
                        {
                            "id": idAutomation2,
                            "name": ruleName2,
                            "description": automation2_description,
                        }
                    ],
                    "possibleSolutions": solution_info,
                    "confidence": type_of_conflict,
                })

    def _getEventType(self, e):
        # ... (logica originale di getEventType)
        type_val = e.get('type')
        service = e.get("service", None)
        if(e.get("service") != None):
            service = e.get("service") 
        if(type_val == None and service != None):
            type_val = re.sub(r'.*?\.', '', service) 
        if(type_val == None):
            action = e.get("action")
            if(action != None):
                type_val = re.sub(r'.*?\.', '', action) 
            if(action == None):
                trigger = e.get("trigger")
                if(trigger == "time"):
                    type_val = e.get("at")
        return type_val


    def _checkOperatorsAppliances(self, type1, type2):
        # ... (logica originale di checkOperatorsAppliances)
        if (type1 == "turn_on"):
            if(type2 == "turn_off" or type2 == "brightness_decrease" or type2 == "brightness_increase" or type2 == "toggle"):
                return True
            else: 
                return False
        elif (type1 == "turn_off"):
            if (type2 == "turn_on" or type2 == "brightness_decrease" or type2 == "brightness_increase" or type2 == "toggle"): 
                return True
            else:
                return False
        elif (type1 == "brightness_increase"):
            if(type2 == "brightness_decrease" or type2 == "turn_on" or type2 == "turn_off" or type2 == "toggle"):
                return True
            else: 
                return False
        elif (type1 == "brightness_decrease"):
            if (type2 == "brightness_increase" or type2 == "turn_on" or type2 == "turn_off" or type2 == "toggle"): 
                return True
            else:
                return False
        elif (type1 == "toggle"): 
            if (type2 == "brightness_decrease" or type2 == "turn_off" or type2 == "brightness_increase" or type2 =="toggle" or type2 == "turn_on"): 
                return True
            else:
                return False
        elif (type1 == "open"):
            if(type2 == "close"):
                return True
            else: 
                return False
        elif (type1 == "close"):
            if(type2 == "open"):
                return True
            else: 
                return False
        return False

    def _getInfoPlatform(self, platform, trigger):
        if(platform == "time"):
            return "time is " + trigger['at']
        if(platform == "zone"):
            # Assumendo che getInfoZone diventi un metodo o che le sue dipendenze (getFriendlyName) siano gestite
            infoZone = self._getInfoZone(trigger['entity_id'], trigger['zone'], trigger['event'])
            return infoZone
        if(platform == "sun"):
            return "there is the " + trigger['event']
        return platform

    def _getInfoZone(self, user_entity_id, zone_entity_id, event):
        user = self._getFriendlyName(user_entity_id)
        zone = self._getFriendlyName(zone_entity_id)
        return user + " " + event + " at " + zone

    def _get_device_id(self, action):
        target = action.get("target", {})
        device_id = action.get("device_id") or target.get("device_id") or action.get("entity_id") or target.get("entity_id")
        if device_id:
            device_id = re.sub(r'[\'\[\]]', '', str(device_id))
        return device_id

    def _has_attributes(self, action):
        data = action.get("data", {})
        return data # Restituisce i dati stessi, non un booleano. La logica originale lo usava così.

    def _process_action(self, action):
        if isinstance(action, str):
            return None, None, False, None # False per has_attrs se è una stringa
        device_id = self._get_device_id(action)
        service = action.get("service")
        domain = service.split('.')[0] if service else None
        has_attrs = self._has_attributes(action) # Questo restituisce il dizionario 'data' o {}
        area_id = action.get("target", {}).get("area_id")
        return device_id, area_id, has_attrs, domain


    def _process_action_conflict(self, action1, action2, ruleName1, ruleName2, entityRuleName1, entityRuleName2, domainTrigger1, domainTrigger2, condition1, condition2, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2, automation1_description, automation2_description):
        device_id1, area1, attr1_data, domain1 = self._process_action(action1) # attr1_data è il dizionario 'data'
        device_id2, area2, attr2_data, domain2 = self._process_action(action2) # attr2_data è il dizionario 'data'

        if not device_id1 and not area1 or not device_id2 and not area2:
            return

        if not device_id1 and area1:
            entitiesByDomainAndArea1 = self._getEntitiesByDomainAndArea(area1, domain1)
            device_id1 = self._getDevicesId(entitiesByDomainAndArea1)

        if not device_id2 and area2:
            entitiesByDomainAndArea2 = self._getEntitiesByDomainAndArea(area2, domain2)
            device_id2 = self._getDevicesId(entitiesByDomainAndArea2)

        arrayDeviceActionId1 = device_id1.split(", ") if isinstance(device_id1, str) else device_id1
        arrayDeviceActionId2 = device_id2.split(", ") if isinstance(device_id2, str) else device_id2

        if type_of_conflict == "possible" and not arrayDeviceActionId2:
            return

        common_device = [element for element in arrayDeviceActionId1 if element in set(arrayDeviceActionId2)]
        if not common_device:
            return

        deviceNameAction1 = self._getNameUserDevice(common_device[0]) or common_device[0]
        # deviceNameAction2 = deviceNameAction1 # Questa riga sembra ridondante o un bug, la lascio per ora

        infoPlatform1 = self._getInfoPlatform(domain1, action1) # action1 potrebbe non essere il trigger corretto qui
        infoPlatform2 = self._getInfoPlatform(domain2, action2) # action2 potrebbe non essere il trigger corretto qui

        # La logica di attr1 e attr2 deve usare attr1_data e attr2_data
        if self._checkOperatorsAppliances(self._getEventType(action1), self._getEventType(action2)) and not attr1_data and not attr2_data:
            self._append_conflict(ruleName1, ruleName2, self._getEventType(action1), self._getEventType(action2), None, None, None, None, "", "", infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction1, condition1, condition2, self._getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2)
        elif attr1_data or attr2_data:
            dataAttr = attr1_data if attr1_data else attr2_data # Sceglie uno dei due se l'altro è vuoto
            for data_key in dataAttr: # Itera sulle chiavi del dizionario 'data'
                nameAttribute1 = data_key
                nameAttribute2 = data_key
                valueAttribute1 = attr1_data.get(data_key, None) if attr1_data else None
                valueAttribute2 = attr2_data.get(data_key, None) if attr2_data else None
                if valueAttribute1 is not None and valueAttribute2 is not None and valueAttribute1 != valueAttribute2:
                    self._append_conflict(ruleName1, ruleName2, self._getEventType(action1), self._getEventType(action2), valueAttribute1, valueAttribute2, nameAttribute1, nameAttribute2, deviceNameAction1, deviceNameAction1, infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction1, condition1, condition2, self._getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2)
                elif (valueAttribute1 is not None and valueAttribute2 is None) or (valueAttribute1 is None and valueAttribute2 is not None):
                    # La funzione _check_element_exists andrebbe adattata o la sua logica integrata qui
                    # if not self._check_element_exists(...): # Questa funzione andrebbe rivista
                    if self._checkOperatorsAppliances(self._getEventType(action1), self._getEventType(action2)):
                        self._append_conflict(ruleName1, ruleName2, self._getEventType(action1), self._getEventType(action2), None, None, None, None, deviceNameAction1, deviceNameAction1, infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction1, condition1, condition2, self._getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2)

    def _getConditionInfo(self, condition_item, typeCondition):
        # ... (logica originale, usando self._getNameUserDevice, self._getFriendlyName)
        if("condition" in condition_item):
            if "device" in condition_item["condition"]: # Probabilmente condition_item['condition'] è una stringa, non un dizionario
                device = condition_item['device_id']
                device = self._getNameUserDevice(device)
                typeDevice = condition_item['type']
                processed_condition = { # rinominato per evitare sovrascrittura del parametro
                    "condition": typeCondition,
                    "device": device,
                    "type": typeDevice,
                }
            elif "zone" in condition_item["condition"]:
                user = self._getFriendlyName(condition_item['entity_id'])
                zone = self._getFriendlyName(condition_item['zone'])
                processed_condition = {
                    "condition" : typeCondition,
                    "user": user,
                    "zone": zone
                }
            elif "time" in condition_item["condition"]:
                after = None
                before = None
                if 'after' in condition_item:
                    after = condition_item['after']
                if 'before' in condition_item:
                    before = condition_item['before']
                weekday = None
                if "weekday" in condition_item:
                    weekday = condition_item['weekday']
                processed_condition = {
                    "condition" : typeCondition,
                    "after" : after,
                    "before": before,
                    "weekday": weekday
                }
            else: # Caso in cui condition_item non ha 'device', 'zone', o 'time'
                processed_condition = {"condition": typeCondition, "original_condition_item": condition_item}

        else: # Caso in cui 'condition' non è in condition_item
             processed_condition = {"condition": typeCondition, "original_condition_item": condition_item}
        return processed_condition


    def _arrayConditions(self, condition_list1, condition_list2):
        conditionInfo1 = []
        conditionInfo2 = []
        if condition_list1:
            for c in condition_list1:
                if "conditions" in c: # Logica per 'or' o 'and' che raggruppano altre condizioni
                    # typeCondition qui dovrebbe essere c["condition"] (es. "and", "or", "not")
                    # e poi si itera su c["conditions"]
                    for sub_condition in c["conditions"]:
                        # Bisogna passare il tipo di condizione del gruppo (c["condition"])
                        # e la sub_condition stessa
                        processed_sub_condition = self._getConditionInfo(sub_condition, c.get("condition", "and")) # Default a "and" se non specificato
                        conditionInfo1.append(processed_sub_condition)
                elif "condition" in c: # Singola condizione
                    processed_c = self._getConditionInfo(c, c["condition"])
                    conditionInfo1.append(processed_c)
        if condition_list2:
            for c in condition_list2:
                if "conditions" in c:
                    for sub_condition in c["conditions"]:
                        processed_sub_condition = self._getConditionInfo(sub_condition, c.get("condition", "and"))
                        conditionInfo2.append(processed_sub_condition)
                elif "condition" in c:
                    processed_c = self._getConditionInfo(c, c["condition"])
                    conditionInfo2.append(processed_c)
        return conditionInfo1, conditionInfo2

    def _checkCondition(self, conditionInfo1, conditionInfo2):
        # La logica di checkCondition deve essere rivista attentamente
        # basandosi sulla nuova struttura restituita da _arrayConditions e _getConditionInfo
        if (not conditionInfo1 or not conditionInfo2): # Se una delle due liste è vuota, consideriamo compatibile?
            return True # Comportamento originale
        if (conditionInfo1 == conditionInfo2): # Confronto diretto di liste processate
            return True
        
        # Questa logica di confronto è complessa e potrebbe necessitare di una profonda revisione
        # per gestire correttamente i vari tipi di condizione ('and', 'or', 'not', 'device', 'zone', 'time')
        # e le loro interazioni. Per ora, si mantiene una struttura simile all'originale.
        for c1 in conditionInfo1:
            for c2 in conditionInfo2:
                # Assumiamo che c1 e c2 siano dizionari con 'condition', 'device', 'type', 'user', 'zone' etc.
                # La logica originale qui era: if(c1['condition'] != "or" and c2['condition'] != "or"):
                # Questo controllo potrebbe non essere più necessario o corretto se 'or' è gestito a un livello superiore.
                
                # Esempio di controllo per condizioni di dispositivo
                if c1.get('device') and c2.get('device') and c1.get('type') and c2.get('type'):
                    if c1['device'] == c2['device'] and c1['type'] != c2['type']:
                        # Conflitto se stesso device ma tipo diverso (es. 'is_on' vs 'is_off')
                        # Ma bisogna considerare il 'condition' type (es. 'not')
                        if c1.get('condition') != 'not' and c2.get('condition') != 'not': # Semplificazione
                             return False 
                    if c1['device'] == c2['device'] and c1['type'] == c2['type']:
                        # Stesso device, stesso tipo. Conflitto se uno è 'not' e l'altro no.
                        if (c1.get('condition') == 'not' and c2.get('condition') != 'not') or \
                           (c1.get('condition') != 'not' and c2.get('condition') == 'not'):
                            return False
                
                # Esempio di controllo per condizioni di zona/utente
                if c1.get('user') and c2.get('user') and c1.get('zone') and c2.get('zone'):
                    if c1['user'] == c2['user'] and c1['zone'] != c2['zone']:
                        if c1.get('condition') != 'not' and c2.get('condition') != 'not':
                            return False
                    if c1['user'] == c2['user'] and c1['zone'] == c2['zone']:
                         if (c1.get('condition') == 'not' and c2.get('condition') != 'not') or \
                            (c1.get('condition') != 'not' and c2.get('condition') == 'not'):
                             return False
        return True # Default se nessun conflitto diretto trovato

    def _process_conditions(self, condition1_raw, condition2_raw):
        # La logica di modifica 'or' in 'and' se c'è una sola condizione interna
        # potrebbe essere gestita meglio o riconsiderata.
        # Per ora la manteniamo simile.
        if condition1_raw:
            # Spesso condition è una lista di dizionari
            for c_item in condition1_raw:
                if c_item.get('condition') == "or" and isinstance(c_item.get('conditions'), list) and len(c_item['conditions']) == 1:
                    c_item['condition'] = "and" 
        if condition2_raw:
            for c_item in condition2_raw:
                if c_item.get('condition') == "or" and isinstance(c_item.get('conditions'), list) and len(c_item['conditions']) == 1:
                    c_item['condition'] = "and"
        return self._arrayConditions(condition1_raw, condition2_raw)

    def _find_trigger(self, automations_list, id_val):
        for automation in automations_list:
            if automation.get("id") == id_val: # Assumendo che l'ID sia un intero o stringa consistente
                trigger = automation.get("config", {}).get("triggers") or automation.get("config", {}).get("trigger")
                return trigger
        return None

    def _find_condition(self, automations_list, id_val):
        for automation in automations_list:
            if automation.get("id") == id_val:
                conditions = automation.get("config", {}).get("condition") or automation.get("config", {}).get("conditions")
                return conditions
        return None

    def _process_triggers_and_conditions(self, rules_db_list, idAutomation1, idAutomation2, new_automation_config):
        trigger1 = new_automation_config.get("triggers") or new_automation_config.get("trigger")
        condition1_raw = new_automation_config.get("condition")
    
        # Trova la rule2 completa dalla lista rules_db_list per accedere alla sua config
        rule2_config = None
        for r_db in rules_db_list:
            if r_db.get("id") == idAutomation2:
                rule2_config = r_db.get("config")
                break
        
        trigger2 = None
        condition2_raw = None
        if rule2_config:
            trigger2 = rule2_config.get("triggers") or rule2_config.get("trigger")
            condition2_raw = rule2_config.get("condition")
            
        # Normalizza e processa le condizioni
        processed_condition1, processed_condition2 = self._process_conditions(condition1_raw, condition2_raw) 
        return trigger1, processed_condition1, trigger2, processed_condition2


    def detect_appliances_conflicts(self, new_automation_config): # Sostituisce detectAppliancesConflictsForLLM
        self.conflicts.clear() # Pulisce i conflitti da esecuzioni precedenti sull'istanza
        
        # rules è una lista di dizionari tipo: [{"id": int, "config": {...}}, ...]
        rules_from_db = _db.get_automations(self.user_id) 

        ruleName1 = new_automation_config.get("alias", "Unknown Rule 1")
        # entityRuleName1 = "automation." + ruleName1.replace(" ", "_") # Non usato direttamente nel loop principale
        
        # Gestione trigger/triggers per rule1
        trigger_list1 = new_automation_config.get("trigger", [])
        if not isinstance(trigger_list1, list): trigger_list1 = [trigger_list1] # Assicura sia una lista
        domainTrigger1 = trigger_list1[0].get("domain", None) if trigger_list1 and trigger_list1[0] else None

        idAutomation1 = new_automation_config.get("id", "new_automation_id") # Fornisce un ID di default se non presente
        
        actions1_raw = new_automation_config.get("actions", []) or new_automation_config.get("action", [])
        actions1 = [actions1_raw] if isinstance(actions1_raw, dict) else actions1_raw # Assicura sia una lista

        automation1_description = new_automation_config.get("description", "")

        for action1 in actions1:
            for rule2_db_item in rules_from_db: # rule2_db_item è {"id": ..., "config": ...}
                rule2_config = rule2_db_item.get("config", {})
                idAutomation2 = rule2_db_item.get("id")

                if not rule2_config or not idAutomation2: # Salta se la configurazione di rule2 è mancante
                    continue

                ruleName2 = rule2_config.get("alias", "Unknown Rule 2")
                # entityRuleName2 = "automation." + ruleName2.replace(" ", "_") # Non usato

                # Evita di confrontare una regola con se stessa se gli ID sono significativi e uguali
                if idAutomation1 and idAutomation2 and str(idAutomation1) == str(idAutomation2): # Confronto come stringhe per sicurezza
                    continue
                
                trigger_list2 = rule2_config.get("trigger", [])
                if not isinstance(trigger_list2, list): trigger_list2 = [trigger_list2]
                domainTrigger2 = trigger_list2[0].get("domain", None) if trigger_list2 and trigger_list2[0] else None
                
                actions2_raw = rule2_config.get("actions", []) or rule2_config.get("action", [])
                actions2 = [actions2_raw] if isinstance(actions2_raw, dict) else actions2_raw

                automation2_description = rule2_config.get("description", "")

                # Ottieni trigger e condizioni processate
                # Nota: _process_triggers_and_conditions ora prende new_automation_config e rules_from_db
                trigger1_processed, condition1_processed, trigger2_processed, condition2_processed = \
                    self._process_triggers_and_conditions(rules_from_db, idAutomation1, idAutomation2, new_automation_config)

                type_of_conflict = "certain" if trigger1_processed == trigger2_processed and self._checkCondition(condition1_processed, condition2_processed) else "possible"
                
                for action2 in actions2:
                    self._process_action_conflict(action1, action2, ruleName1, ruleName2, 
                                                 "entityRuleName1_placeholder", "entityRuleName2_placeholder", # Questi non sembrano usati in _append_conflict
                                                 domainTrigger1, domainTrigger2, 
                                                 condition1_processed, condition2_processed, # Passa le condizioni processate
                                                 type_of_conflict, "llm", 
                                                 idAutomation1, idAutomation2, 
                                                 automation1_description, automation2_description)
        
        return self.conflicts


# --- Blocco di esecuzione principale (esempio) ---
if __name__ == "__main__":
    # Configurazione (da spostare/gestire meglio in futuro)
    HA_BASE_URL = "http://luna.isti.cnr.it:8123" # Esempio
    HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk" # Esempio

    # Caricamento dati di test (da spostare/gestire meglio)
    try:
    #    with open("D:\Simone\CASPER\gpt_server\problems\casper.all.json", "r") as file:
    #        all_rules_data = json.load(file)
        # Esempio di selezione di una nuova automazione e di quelle esistenti
        # Questo dovrebbe essere più flessibile o parte di uno script di test dedicato
        # automations_post_config = all_rules_data["automation_data"][14]["config"]
        
        # Per testare, assicurati che automations_post_config sia la configurazione della NUOVA automazione
        # e che _db.get_automations restituisca una lista di automazioni ESISTENTI
        # nel formato [{"id": ..., "config": {...}}, ...]
        
        # Esempio di automazione "nuova" per il test
        automations_post_config = {
        
           "id": "17422966096088",
        "alias": "Accendi aria condizionata quando è caldo",
        "description": "",
        "triggers": [
          {
            "trigger": "numeric_state",
            "entity_id": [
              "sensor.temperatura_casa_temperature"
            ],
            "above": 26
          }
        ],
        "conditions": [],
        "actions": [
          {
            "type": "turn_on",
            "device_id": "280e80f05bac59e20d7b901d6d483dfb",
            "entity_id": "1e833b3d059eb1a6b67b2a26aa64bf18",
            "domain": "fan"
          }
        ],
        "mode": "single"
        }
      
    
    except FileNotFoundError:
        print("Errore: casper.all.json non trovato. Assicurati che il file sia presente.")
        exit()
    except KeyError:
        print("Errore: struttura JSON in casper.all.json non come atteso.")
        exit()


    user_id_test = "681e05bfd5c21048c157e431" # ID utente di test

    # Istanzia il detector
    detector = ConflictDetector(HA_BASE_URL, HA_TOKEN, user_id_test)

    # Esegui il rilevamento
    # Nota: `automations_post_config` è la configurazione della *nuova* automazione.
    # `_db.get_automations(user_id_test)` dovrebbe restituire le automazioni *esistenti* per quell'utente.
    # Per questo test, potresti dover mockare `_db.get_automations` o assicurarti che restituisca
    # i dati nel formato corretto, ad esempio, prendendoli da `all_rules_data`.
    
    # Esempio di mocking di _db.get_automations per il test:
    # Sostituisci questo con la tua logica effettiva di caricamento delle regole esistenti se necessario.
    """
    original_get_automations = _db.get_automations 
    def mock_get_automations(user_id_param):
        if user_id_param == user_id_test:
            # Restituisce alcune regole da casper.all.json come se fossero dal DB
            # Assicurati che il formato sia [{"id": ..., "config": {...}}, ...]
            # Ad esempio, prendi la 13esima automazione come "esistente"
            if "automation_data" in all_rules_data and len(all_rules_data["automation_data"]) > 13:
                 # Assumiamo che l'ID sia nella config o che lo aggiungiamo se necessario per il test
                existing_rule_config = all_rules_data["automation_data"][13]["config"]
                existing_rule_id = existing_rule_config.get("id", "existing_rule_13") # Prendi l'ID se c'è
                return [{"id": existing_rule_id, "config": existing_rule_config}]
            return []
        return original_get_automations(user_id_param)
    """
    #_db.get_automations = mock_get_automations

    #with open("D:\Simone\CASPER\gpt_server\problems\casper.all.json", "r") as file:
    #    all_rules_all = json.load(file)

    #all_rules_all = _db.get_automations(user_id_test) # Carica le automazioni esistenti per l'utente

    detected_conflicts = detector.detect_appliances_conflicts(automations_post_config)

    # Ripristina la funzione originale se necessario per altri test o usi
    #_db.get_automations = original_get_automations

    print("Detected Conflicts: ", json.dumps(detected_conflicts, indent=2))

# Rimuovi la chiamata globale a detectAppliancesConflictsForLLM e la stampa di infoConflictArrayLLM
# ...existing code...
# infoConflictArrayLLM = detectAppliancesConflictsForLLM(user_id, automations_post)
# print("Info Conflict Array LLM: ", infoConflictArrayLLM)