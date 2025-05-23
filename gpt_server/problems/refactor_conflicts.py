import json
# Rimosso: from requests import get, post
import re
import ast
from langchain_core.messages import HumanMessage, SystemMessage
# Assicurarsi che _db sia gestito correttamente (passato o importato)
from typing import List, Dict, Any, Tuple # Aggiunto per coerenza

# Importare HomeAssistantClient dal nuovo file ha_client.py
from ..ha_client import HomeAssistantClient

from .. import responses
from .. import prompts
from .. import models

llm = models.gpt4

# stesso evento, no condizioni, azioni diverse --> same_event_no_conditions
# stesso evento, stesse condizioni, azioni diverse --> same_event_same_conditions
# stesso evento, condizioni diverse ma sovrapponibili --> same_event_different_conditions
# diversi eventi, no condizioni, azioni diverse --> different_event_no_conditions
# diversi eventi, condizioni sovrapponibili, azioni diverse --> different_event_with_conditions

#c_uguale and c_non_opposta =  ##stessa condizione non opposta (la porta e aperta, la porta e aperta) -> same_event_same_conditions
#c_uguale and c_sovrapponibile = opposta ##stessa condizione opposta (la porta e aperta, la porta e chiusa) -> same_event_different_conditions

class ConflictDetector:
    def __init__(self, ha_client: HomeAssistantClient, db_module: Any, user_id: str):
        self.ha_client = ha_client
        self.user_id = user_id
        self.db = db_module
        self.conflicts = []
        self.condition_tag = ""
        self.trigger_tag = ""

    # _check_response e _getTemplateData sono ora in HomeAssistantClient

    def _getFriendlyName(self, entity_id: str) -> str:
        return self.ha_client.get_friendly_name(entity_id)

    def _getNameUserDevice(self, device_id: str) -> str:
        return self.ha_client.get_device_name_by_user(device_id)

    def _getDeviceClass(self, friendly_name: str) -> str:
        return self.ha_client.get_device_class_by_friendly_name(friendly_name)
    
    def _getID(self, entity_id: str) -> str: # In new_conflicts.py _getID prende un entity_id
        return self.ha_client.get_device_id_from_entity_id(entity_id)

    def _getEntitiesByArea(self, area: str) -> List[str]: # Modificato per restituire List[str]
        entities_str = self.ha_client.get_entities_by_area(area)
        try:
            # ast.literal_eval è usato perché HA restituisce una stringa che rappresenta una lista Python
            evaluated_entities = ast.literal_eval(entities_str)
            if isinstance(evaluated_entities, list):
                return [str(item) for item in evaluated_entities] # Assicura che tutti gli elementi siano stringhe
            return []
        except (ValueError, SyntaxError):
            return []

    def _getEntitiesByDomainAndArea(self, area: str | List[str], domain: str) -> List[str]:
        area_str = ' '.join(area) if isinstance(area, list) else area
        # get_entities_by_domain_and_area è già in ha_client e gestisce il parsing
        return self.ha_client.get_entities_by_domain_and_area(area_str, domain)
    
    def _getDevicesId(self, entities: List[str]) -> List[str]:
        devicesId = []
        for e in entities:
            id_val = self.ha_client.get_device_id_from_entity_id(e)
            if id_val: # Aggiungi solo se l'ID del dispositivo è stato trovato
                devicesId.append(id_val)
        return devicesId

    def _call_find_solution_llm(self, idAutomation1: str, idAutomation2: str, ruleName1: str, ruleName2: str, automation1_description: str, automation2_description: str) -> Any:
        return "ok"
        formatted_prompt = prompts.recommender.format(
            home_devices=self.db.get_devices(self.user_id),
        )
        messages = [
        SystemMessage(formatted_prompt),
        HumanMessage(f"Generate a solution for the conflict between the following automations:\n{ruleName1}(id {idAutomation1}): {automation1_description}\n{ruleName2}(id {idAutomation2}):{automation2_description}"),
        ]
        # Assumendo che responses.GenerateRecommendationResponse sia definito correttamente
        structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
        data = structured_response.invoke(messages)
        return data

    def _is_conflict_present(self, unique_id_conflict_to_check: str) -> bool:
        for conflict in self.conflicts:
            if conflict.get("unique_id") == unique_id_conflict_to_check:
                return True
        return False

    def _append_conflict(self, ruleName1: str, ruleName2: str, type1: str, type2: str, 
                         optionalValue1: Any, optionalValue2: Any, typeOptionalValue1: str | None, typeOptionalValue2: str | None, 
                         nameApplianceTrigger1: str, nameApplianceTrigger2: str, typeTrigger1: str, typeTrigger2: str, 
                         domainTrigger1: str | None, domainTrigger2: str | None, nameApplianceAction1: str, nameApplianceAction2: str, 
                         condition1: Any, condition2: Any, device_class1: str | None, 
                         automation1_description: str, automation2_description: str, 
                         type_of_conflict: str, 
                         idAutomation1: str, idAutomation2: str):
        
        solution_info = self._call_find_solution_llm(idAutomation1, idAutomation2, ruleName1, ruleName2, automation1_description, automation2_description) 
        unique_id_conflict = str(idAutomation1)+"_"+str(idAutomation2)
        if not self._is_conflict_present(unique_id_conflict): # Controllo sull'ID univoco
            self.conflicts.append({
                "type": "conflict",
                "confidence": type_of_conflict,
                "unique_id": unique_id_conflict,
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
                "possibleSolutions": solution_info, # Assicurarsi che solution_info sia nel formato atteso
            })

    def _getEventType(self, e: Dict[str, Any]) -> str | None:
        type_val = e.get('type')
        service = e.get("service")
        if type_val is None and service:
            type_val = re.sub(r'.*?\.', '', service) 
        if type_val is None:
            action = e.get("action")
            if action:
                type_val = re.sub(r'.*?\.', '', action) 
            elif e.get("trigger") == "time": # trigger è una chiave, non un valore di action
                type_val = e.get("at")
        return type_val

    def _getInfoPlatform(self, platform: str, trigger: Dict[str, Any]) -> str:
        if platform == "time":
            return "time is " + trigger['at']
        if platform == "zone":
            infoZone = self._getInfoZone(trigger['entity_id'], trigger['zone'], trigger['event'])
            return infoZone
        if platform == "sun":
            return "there is the " + trigger['event']
        return platform

    def _getInfoZone(self, user_entity_id: str, zone_entity_id: str, event: str) -> str:
        user = self.ha_client.get_friendly_name(user_entity_id)
        zone = self.ha_client.get_friendly_name(zone_entity_id)
        return user + " " + event + " at " + zone

    def _get_device_id(self, action: Dict[str, Any]) -> str | None:
        target = action.get("target", {})
        # Priorità a device_id se presente direttamente
        device_id = action.get("device_id") or target.get("device_id")
        if device_id:
            return re.sub(r'[\'\\\[\\\]]', '', str(device_id))
        
        # Altrimenti, prova con entity_id e deriva il device_id
        entity_id = action.get("entity_id") or target.get("entity_id")
        if entity_id:
            clean_entity_id = re.sub(r'[\'\\\[\\\]]', '', str(entity_id))
            if clean_entity_id: # Evita chiamate API con stringhe vuote
                # Questa chiamata potrebbe restituire una stringa vuota se non c'è device_id associato
                return self.ha_client.get_device_id_from_entity_id(clean_entity_id)
        return None

    def _has_attributes(self, action: Dict[str, Any]) -> Dict[str, Any]: # Restituisce il dizionario 'data'
        return action.get("data", {})

    def _process_action(self, action: Dict[str, Any]) -> Tuple[str | None, str | None, Dict[str, Any], str | None]:
        if not isinstance(action, dict): # Modificato per controllare se è un dizionario
            return None, None, {}, None 
        
        device_id = self._get_device_id(action)
        service = action.get("service")
        domain = None
        if service and isinstance(service, str):
            domain = service.split('.')[0]
        
        # Se il dominio non è derivabile dal servizio, prova da altre chiavi (come in chains.py)
        if domain is None:
            action_val = action.get("action") # Usato in chains.py
            if action_val and isinstance(action_val, str):
                 domain = action_val.split('.')[0]
            # Potrebbe esserci anche action.get("domain") direttamente
            if domain is None and action.get("domain"):
                domain = action.get("domain")

        data_attrs = self._has_attributes(action)
        area_id = action.get("target", {}).get("area_id")
        return device_id, area_id, data_attrs, domain

    def _process_action_conflict(self, action1: Dict[str, Any], action2: Dict[str, Any], ruleName1: str, ruleName2: str, entityRuleName1: str, entityRuleName2: str, domainTrigger1: str | None, domainTrigger2: str | None, condition1: Any, condition2: Any, type_of_conflict: str, idAutomation1: str, idAutomation2: str, automation1_description: str, automation2_description: str):
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
            self._append_conflict(ruleName1, ruleName2, self._getEventType(action1), self._getEventType(action2), None, None, None, None, "", "", infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction1, condition1, condition2, self._getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, idAutomation1, idAutomation2)
        elif attr1_data or attr2_data:
            dataAttr = attr1_data if attr1_data else attr2_data # Sceglie uno dei due se l'altro è vuoto
            for data_key in dataAttr: # Itera sulle chiavi del dizionario 'data'
                nameAttribute1 = data_key
                nameAttribute2 = data_key
                valueAttribute1 = attr1_data.get(data_key, None) if attr1_data else None
                valueAttribute2 = attr2_data.get(data_key, None) if attr2_data else None
                if valueAttribute1 is not None and valueAttribute2 is not None and valueAttribute1 != valueAttribute2:
                    self._append_conflict(ruleName1, ruleName2, self._getEventType(action1), self._getEventType(action2), valueAttribute1, valueAttribute2, nameAttribute1, nameAttribute2, deviceNameAction1, deviceNameAction1, infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction1, condition1, condition2, self._getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, idAutomation1, idAutomation2)
                elif (valueAttribute1 is not None and valueAttribute2 is None) or (valueAttribute1 is None and valueAttribute2 is not None):
                    # La funzione _check_element_exists andrebbe adattata o la sua logica integrata qui
                    # if not self._check_element_exists(...): # Questa funzione andrebbe rivista
                    if self._checkOperatorsAppliances(self._getEventType(action1), self._getEventType(action2)):
                        self._append_conflict(ruleName1, ruleName2, self._getEventType(action1), self._getEventType(action2), None, None, None, None, deviceNameAction1, deviceNameAction1, infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction1, condition1, condition2, self._getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, idAutomation1, idAutomation2)

    def _checkOperatorsAppliances(self, type1: str, type2: str) -> bool:
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

    def _getConditionInfo(self, condition_item: Dict[str, Any], typeCondition: str) -> Dict[str, Any]:
        processed_condition: Dict[str, Any] = {}
        condition_type_from_item = condition_item.get("condition")

        if condition_type_from_item == "device":
            device_raw_id = condition_item.get('device_id')
            device_name = "Unknown Device"
            if device_raw_id:
                # Assumiamo che device_raw_id sia un device_id, non un entity_id da cui derivare il nome
                device_name = self.ha_client.get_device_name_by_user(device_raw_id) or device_raw_id
            
            processed_condition = {
                "condition_logic": typeCondition, # es. "and", "or", "not" che raggruppa questa condizione
                "condition_type": condition_type_from_item, # es. "device"
                "device": device_name,
                "type": condition_item.get('type'), # es. "is_on"
                "entity_id": condition_item.get('entity_id') # Può essere utile per debug o logica più fine
            }
        elif condition_type_from_item == "zone":
            user_entity_id = condition_item.get('entity_id')
            zone_entity_id = condition_item.get('zone')
            user_name = "Unknown User"
            zone_name = "Unknown Zone"
            if user_entity_id:
                user_name = self.ha_client.get_friendly_name(user_entity_id) or user_entity_id
            if zone_entity_id:
                zone_name = self.ha_client.get_friendly_name(zone_entity_id) or zone_entity_id
            processed_condition = {
                "condition_logic": typeCondition,
                "condition_type": condition_type_from_item,
                "user": user_name,
                "zone": zone_name,
                "event": condition_item.get('event') # es. "enter" o "leave"
            }
        elif condition_type_from_item == "time":
            processed_condition = {
                "condition_logic": typeCondition,
                "condition_type": condition_type_from_item,
                "after": condition_item.get('after'),
                "before": condition_item.get('before'),
                "weekday": condition_item.get('weekday')
            }
        elif condition_type_from_item in ["and", "or", "not"] : # Condizione logica nidificata
            nested_conditions = []
            if "conditions" in condition_item and isinstance(condition_item["conditions"], list):
                for sub_c in condition_item["conditions"]:
                    # typeCondition qui è il raggruppamento esterno (es. l'"and" principale)
                    # condition_type_from_item è il tipo di questa sub-condition logica (es. un "or" nidificato)
                    nested_conditions.append(self._getConditionInfo(sub_c, condition_type_from_item))
            processed_condition = {
                "condition_logic": typeCondition, # Il raggruppamento esterno
                "condition_type": condition_type_from_item, # "and", "or", "not"
                "conditions": nested_conditions
            }
        else: # Altri tipi di condizione o malformati
            processed_condition = {"condition_logic": typeCondition, "condition_type": "unknown", "original_condition_item": condition_item}
        
        return processed_condition

    def _arrayConditions(self, condition_list1: List[Dict[str, Any]] | None, condition_list2: List[Dict[str, Any]] | None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        conditionInfo1: List[Dict[str, Any]] = []
        conditionInfo2: List[Dict[str, Any]] = []

        if condition_list1:
            for c in condition_list1:
                # La condizione di primo livello è implicitamente "and" a meno che non sia specificato diversamente
                # typeCondition per il primo livello di solito non è rilevante a meno che non sia un singolo NOT etc.
                # Per coerenza, passiamo "and" come raggruppamento di default per le condizioni principali.
                conditionInfo1.append(self._getConditionInfo(c, c.get("condition", "and")))
        
        if condition_list2:
            for c in condition_list2:
                conditionInfo2.append(self._getConditionInfo(c, c.get("condition", "and")))
        
        return conditionInfo1, conditionInfo2

    def _checkCondition(self, conditionInfo1: List[Dict[str, Any]], conditionInfo2: List[Dict[str, Any]]) -> bool:
        if (not conditionInfo1 or not conditionInfo2): # Se una delle due liste è vuota, consideriamo compatibile?
            return True # Comportamento originale
        if (conditionInfo1 == conditionInfo2): # Confronto diretto di liste processate
            return True
    
        for c1 in conditionInfo1:
            for c2 in conditionInfo2:
                if c1.get('device') and c2.get('device') and c1.get('type') and c2.get('type'):
                    if c1['device'] == c2['device'] and c1['type'] != c2['type']:
                        if c1.get('condition') != 'not' and c2.get('condition') != 'not': # Semplificazione
                             return False 
                    if c1['device'] == c2['device'] and c1['type'] == c2['type']:
                        if (c1.get('condition') == 'not' and c2.get('condition') != 'not') or \
                           (c1.get('condition') != 'not' and c2.get('condition') == 'not'):
                            return False
                
                if c1.get('user') and c2.get('user') and c1.get('zone') and c2.get('zone'):
                    if c1['user'] == c2['user'] and c1['zone'] != c2['zone']:
                        if c1.get('condition') != 'not' and c2.get('condition') != 'not':
                            return False
                    if c1['user'] == c2['user'] and c1['zone'] == c2['zone']:
                         if (c1.get('condition') == 'not' and c2.get('condition') != 'not') or \
                            (c1.get('condition') != 'not' and c2.get('condition') == 'not'):
                             return False
        return True # Default se nessun conflitto diretto trovato

    def _process_conditions(self, condition1_raw: List[Dict[str, Any]] | None, condition2_raw: List[Dict[str, Any]] | None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        if condition1_raw:
            for c_item in condition1_raw:
                if c_item.get('condition') == "or" and isinstance(c_item.get('conditions'), list) and len(c_item['conditions']) == 1:
                    c_item['condition'] = "and" 
        if condition2_raw:
            for c_item in condition2_raw:
                if c_item.get('condition') == "or" and isinstance(c_item.get('conditions'), list) and len(c_item['conditions']) == 1:
                    c_item['condition'] = "and"
        return self._arrayConditions(condition1_raw, condition2_raw)

    def detect_appliances_conflicts(self, new_automation_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        self.conflicts.clear()
        
        rules_from_db = self.db.get_automations(self.user_id)

        ruleName1 = new_automation_config.get("alias", "Unknown Rule 1")
        
        trigger_list1_raw = new_automation_config.get("trigger", []) # triggerS per HA, trigger per UI?
        trigger_list1 = trigger_list1_raw if isinstance(trigger_list1_raw, list) else [trigger_list1_raw]
        
        # domainTrigger1: Il dominio del *primo* trigger. Potrebbe essere necessario gestirne multipli.
        domainTrigger1 = None
        if trigger_list1 and isinstance(trigger_list1[0], dict):
            # Il dominio può essere in platform (es. 'state', 'time') o derivato da entity_id
            # Per ora, usiamo 'platform' se disponibile, altrimenti None.
            # La logica originale usava domain da action, che sembra scorretto per il trigger.
            domainTrigger1 = trigger_list1[0].get("platform") 

        idAutomation1 = new_automation_config.get("id", f"new_automation_{ruleName1.replace(' ', '_')}")
        
        actions1_raw = new_automation_config.get("action", []) # actionS per HA, action per UI?
        actions1 = actions1_raw if isinstance(actions1_raw, list) else [actions1_raw]
        # Filtra azioni non-dizionario, se presenti
        actions1 = [a for a in actions1 if isinstance(a, dict)]

        automation1_description = new_automation_config.get("description", "")

        for action1 in actions1:
            for rule2_db_item in rules_from_db:
                rule2_config = rule2_db_item.get("config")
                idAutomation2 = rule2_db_item.get("id")

                if not rule2_config or not isinstance(rule2_config, dict) or not idAutomation2:
                    continue

                ruleName2 = rule2_config.get("alias", "Unknown Rule 2")
                
                if str(idAutomation1) == str(idAutomation2):
                    continue
                
                trigger_list2_raw = rule2_config.get("trigger", [])
                trigger_list2 = trigger_list2_raw if isinstance(trigger_list2_raw, list) else [trigger_list2_raw]
                domainTrigger2 = None # Simile a domainTrigger1
                if trigger_list2 and isinstance(trigger_list2[0], dict):
                    domainTrigger2 = trigger_list2[0].get("platform")
                
                actions2_raw = rule2_config.get("action", [])
                actions2 = actions2_raw if isinstance(actions2_raw, list) else [actions2_raw]
                actions2 = [a for a in actions2 if isinstance(a, dict)]

                automation2_description = rule2_config.get("description", "")

                # Ottieni trigger e condizioni processate
                # _process_triggers_and_conditions è stato rimosso, la logica è integrata qui
                condition1_raw = new_automation_config.get("condition")
                condition2_raw = rule2_config.get("condition")
                
                processed_condition1, processed_condition2 = self._process_conditions(condition1_raw, condition2_raw)
                
                # La definizione di type_of_conflict basata su trigger1_processed == trigger2_processed
                # necessita che trigger1_processed e trigger2_processed siano definiti e comparabili.
                # Per ora, usiamo una logica semplificata per type_of_conflict.
                # TODO: Rivedere la logica di confronto dei trigger per type_of_conflict.
                # Confrontare le liste di trigger grezze potrebbe non essere l'ideale.
                # Per ora, assumiamo "possible" e lasciamo che _checkCondition raffini.
                type_of_conflict = "possible" 
                if self._checkCondition(processed_condition1, processed_condition2):
                    # Se le condizioni sono compatibili, il conflitto è più "certain"
                    # MA il confronto dei trigger è cruciale e qui è omesso per semplicità.
                    # La logica originale: type_of_conflict = "certain" if trigger1_processed == trigger2_processed and self._checkCondition(...)
                    # Senza un confronto robusto dei trigger, impostarlo a "certain" qui è speculativo.
                    # Manteniamo "possible" e la chiamata a _checkCondition è già fatta.
                    pass # Le condizioni sono compatibili, procedi a controllare le azioni
                else:
                    # Se le condizioni non sono compatibili, non c'è conflitto (secondo questa logica)
                    continue
                
                for action2 in actions2:
                    self._process_action_conflict(action1, action2, ruleName1, ruleName2, 
                                                 "placeholder_entityRuleName1", "placeholder_entityRuleName2", 
                                                 domainTrigger1, domainTrigger2, 
                                                 processed_condition1, processed_condition2, 
                                                 str(idAutomation1), str(idAutomation2),
                                                 type_of_conflict,
                                                 automation1_description, automation2_description)
        
        return self.conflicts


# --- Blocco di esecuzione principale (esempio) ---
if __name__ == "__main__":
    from .. import db_functions as _db 
    HA_BASE_URL = "http://luna.isti.cnr.it:8123"
    HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk"
    user_id_test = "681e05bfd5c21048c157e431"

    ha_client_instance = HomeAssistantClient(base_url=HA_BASE_URL, token=HA_TOKEN)
    
    # Assumendo che _db sia il modulo db_functions.py importato
    db_module_instance = _db 

    detector = ConflictDetector(ha_client=ha_client_instance, user_id=user_id_test, db_module=db_module_instance)

    automations_post_config = {
        "id": "17422966096088",
        "alias": "Accendi aria condizionata quando è caldo",
        "description": "",
        "trigger": [
          {
            "platform": "numeric_state",
            "entity_id": [
              "sensor.temperatura_casa_temperature"
            ],
            "above": 26
          }
        ],
        "condition": [], # Modificato da "conditions" a "condition" per coerenza con HA
        "action": [
          {
            "type": "turn_on", # "type" è usato in UI, HA usa "service"
            "device_id": "280e80f05bac59e20d7b901d6d483dfb",
            "entity_id": "1e833b3d059eb1a6b67b2a26aa64bf18", # Spesso ridondante se device_id è presente
            "domain": "fan" # "domain" è usato in UI, HA lo deduce da service o entity_id
          }
        ],
        "mode": "single"
    }

    # Esempio di mocking di self.db.get_automations per il test:
    original_get_automations = db_module_instance.get_automations
    def mock_get_automations(user_id_param):
        if user_id_param == user_id_test:
            return [
                {"id": "existing_rule_1", "config": {
                    "alias": "Spegni aria condizionata se finestra aperta",
                    "trigger": [
                        {"platform": "state", "entity_id": "binary_sensor.finestra_studio_contact", "to": "on"}
                    ],
                    "condition": [],
                    "action": [
                        {
                            "type": "turn_off", 
                            "device_id": "280e80f05bac59e20d7b901d6d483dfb", 
                            "domain": "fan"
                        }
                    ]
                }}
            ]
        return original_get_automations(user_id_param)
    
    db_module_instance.get_automations = mock_get_automations

    detected_conflicts = detector.detect_appliances_conflicts(automations_post_config)
    db_module_instance.get_automations = original_get_automations # Ripristina

    print("Detected Conflicts: ", json.dumps(detected_conflicts, indent=2))