import json
import re
from typing import List, Dict, Any, Tuple
from collections import OrderedDict
from problems.list_devices_variables import list_devices
# Importa HomeAssistantClient dal nuovo file
from ha_client import HomeAssistantClient


from langchain_core.messages import HumanMessage, SystemMessage
import prompts
import db_functions as _db
import models
import responses

llm = models.gpt4

class ChainsDetector:
    def __init__(self, ha_client: HomeAssistantClient, user_id: str):
        self.ha_client = ha_client
        self.list_devices_variables = list_devices
        self.user_id = user_id
        # self.all_ha_states = self._initialize_states() # Removed global states, fetch when needed or pass if required by many methods

    # def _initialize_states(self) -> List[Dict[str, Any]]: # Changed from global
    #     states_str = self.ha_client.get_all_states()
    #     try:
    #         return json.loads(states_str)
    #     except json.JSONDecodeError:
    #         # Log error or raise
    #         return []

    # Search for the entity ID of the automation based on the ID of the automation's 'attributes' element
    # This function operates on data that might come from get_all_states.
    # Consider if it should be a static method or if 'data' should be fetched internally.
    @staticmethod
    def find_automation_entity_id(all_states_data: List[Dict[str, Any]], automation_id: str) -> str | None:
        for item in all_states_data:
            if 'attributes' in item and item['attributes'].get('id') == automation_id:
                return item.get('entity_id')
        return None

    def get_event_type(self, e: Dict[str, Any]) -> str:
        type_event = e.get('type') or e.get("type_action")
        service = e.get("service")
        if isinstance(type_event, str) and '.' in type_event:
            type_event = type_event.split('.')[-1]
        
        if type_event == "set_preset_mode":
            type_event = "turn_on"
        if service == "switch.turn_on": 
            return "turn_on"
        if service == "switch.turn_off":
            return "turn_off"

        if type_event is None and service:
            type_event = re.sub(r'.*?\\.', '', service)
        if type_event is None:
            action_val = e.get("action") # Renamed from 'action' to avoid conflict
            if action_val is not None:
                type_event = action_val.split('.')[-1]
        if type_event is None:
            trigger = e.get("trigger")
            type_event = trigger
        if type_event is None:
            type_event = e.get("to")
            type_event = "turned_on" if type_event == "on" else "turned_off"
        return type_event if type_event is not None else "unknown" # Ensure a string is always returned

    def check_operator(self, type1: str, type2: str) -> bool:
        #print(f"Checking operator between {type1} and {type2}")
        return (type1 == "turn_on" and type2 == "turned_on") or \
               (type1 == "turn_off" and type2 == "turned_off") or \
               (type1 == type2)

    def is_chain_present(self, chain_array: List[Dict[str, Any]], unique_id: str) -> bool:
        for chain in chain_array:
            if chain.get("unique_id") == unique_id:
                return True
        return False

    def _get_device_id_from_action(self, action: Dict[str, Any]) -> str | None: # Renamed from get_device_id
        target = action.get("target", {})
        device_id = action.get("device_id") or target.get("device_id") or \
                    action.get("entity_id") or target.get("entity_id")
        return re.sub(r'[\'\\\[\\\]]', '', str(device_id)) if device_id else None

    def process_action(self, action: Dict[str, Any]) -> Tuple[str | None, str | None, bool, str | None]:
        if isinstance(action, str): # Should not happen with typed automations
            return None, None, False, None
        
        device_id = self._get_device_id_from_action(action)
        service = action.get("service")
        domain = action.get("domain") or (service.split('.')[0] if service else None)
        if domain is None: # Original had 'domain == None'
            action_val = action.get("action")
            if action_val: # Original had 'action.get("action").split('.')[0]'
                 domain = action_val.split('.')[0]

        has_attrs = bool(action.get("data"))
        area_id = action.get("target", {}).get("area_id")
        return device_id, area_id, has_attrs, domain

    def get_devices_ids_from_entity_ids(self, entity_ids: List[str]) -> List[str]:
        return [self.ha_client.get_device_id_from_entity_id(e) for e in entity_ids]

    def process_action_for_chain(self, action: Dict[str, Any]) -> Tuple[str | List[str] | None, str | None, str | None]:
        device_action, area_action, _, domain_action = self.process_action(action)
        if not device_action and area_action and domain_action: # Ensure domain_action is not None
            entities_by_domain_and_area = self.ha_client.get_entities_by_domain_and_area(area_action, domain_action)
            # get_devices_ids_from_entity_ids expects List[str], ensure entities_by_domain_and_area is List[str]
            if entities_by_domain_and_area:
                 device_action = self.get_devices_ids_from_entity_ids(entities_by_domain_and_area)
        return device_action, area_action, domain_action

    def process_trigger(self, entity_trigger: str | List[str]) -> Tuple[str | None, str | None]:
        # entity_trigger can be a single entity_id string or a list of them.
        # The original code only used the first one if it was a list.
        # This might need refinement based on how multiple entity_triggers should be handled.
        first_entity_id = entity_trigger[0] if isinstance(entity_trigger, list) and entity_trigger else entity_trigger
        
        if not isinstance(first_entity_id, str): # Guard against non-string values
            return None, None

        device_trigger = self.ha_client.get_device_id_from_entity_id(first_entity_id)
        device_class_trigger = self.ha_client.get_device_class_by_entity_id(first_entity_id)
        return device_trigger, device_class_trigger

    def get_context_variables(self, action_domain: str, event_type: str) -> OrderedDict:
        domain_data = self.list_devices_variables.get("list_of_domains", {}).get(action_domain, {})
        for item in domain_data.get("possibleValues", []):
            if self.check_operator(item.get("value"), event_type):
                return OrderedDict([
                    ("decrease", item.get("decrease_variable", [])),
                    ("increase", item.get("increase_variable", []))
                ])
        return OrderedDict([("decrease", []), ("increase", [])])
    

    #########  STUFF FOR GETTING SOLUTIONS #########

    def call_find_solution_llm(self, idAutomation1: str, idAutomation2: str, ruleName1: str, ruleName2: str, automation1_description: str, automation2_description: str):  
        formatted_prompt = prompts.recommender_chains.format(
                home_devices=_db.get_devices(self.user_id), # Use self.user_id
            )
        messages = [
            SystemMessage(formatted_prompt),
            HumanMessage(f"Generate a solution for the chain activation between the following automations:\n{ruleName1}(id {idAutomation1}): {automation1_description}\n{ruleName2}(id {idAutomation2}):{automation2_description}"),
        ]
        structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
        data = structured_response.invoke(messages)
        return data


    def process_direct_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2: Dict[str, Any],
                         action1_details: Dict[str, Any], 
                         rule1_name: str, id_automation1: str,
                         rule2_entity_id: str):
    
        # DIREZIONE 1: Rule1 → Rule2 
        self._check_chain_direction(rule_chain, rule1, rule2, action1_details, rule1_name, id_automation1, "rule1_to_rule2")
        
        # DIREZIONE 2: Rule2 → Rule1
        self._check_chain_direction(rule_chain, rule2, rule1, None, rule1_name, id_automation1, "rule2_to_rule1")

    def _check_chain_direction(self, rule_chain: List[Dict[str, Any]], 
                          source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                          source_action_details: Dict[str, Any] = None,
                          rule1_name: str = "", id_automation1: str = "",
                          direction: str = ""):
    
        print(f"\n--- Checking direction: {direction} ---")
        print(f"Source: {source_rule.get('alias', 'No alias')}")
        print(f"Target: {target_rule.get('alias', 'No alias')}")
        
        # Se non abbiamo i dettagli dell'azione (direzione 2), li calcoliamo
        if source_action_details is None:
            source_actions = source_rule.get("actions", []) or source_rule.get("action", [])
            if not isinstance(source_actions, list):
                source_actions = [source_actions]
            
            # Processa ogni azione della regola sorgente
            for source_action in source_actions:
                if not isinstance(source_action, dict):
                    continue
                
                device_action_source, _, domain_source = self.process_action_for_chain(source_action)
                type_action_source = self.get_event_type(source_action)
                
                source_action_details = {
                    'device_action': device_action_source,
                    'type_action': type_action_source,
                    'domain': domain_source
                }
                
                print(f"Source action details: {source_action_details}")
                
                # Controlla se questa azione può triggerare la regola target
                chain_found = self._check_action_trigger_match(
                    rule_chain, source_rule, target_rule, source_action_details, 
                    rule1_name, id_automation1, direction
                )
                
                if chain_found:
                    break  # Una catena trovata è sufficiente
        else:
            # Direzione 1: usa i dettagli dell'azione già forniti
            self._check_action_trigger_match(
                rule_chain, source_rule, target_rule, source_action_details, 
                rule1_name, id_automation1, direction
            )
    
    def _check_action_trigger_match(self, rule_chain: List[Dict[str, Any]],
                               source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                               source_action_details: Dict[str, Any],
                               rule1_name: str, id_automation1: str, direction: str) -> bool:
    
        device_action_source = source_action_details['device_action']
        type_action_source = source_action_details['type_action']
        
        print(f"Checking action: device={device_action_source}, type={type_action_source}")
        
        # Ottieni i trigger della regola target
        target_triggers = target_rule.get("triggers", []) or target_rule.get("trigger", [])
        if not isinstance(target_triggers, list):
            target_triggers = [target_triggers]
        
        if not target_triggers:
            print("No triggers in target rule")
            return False
        
        for trigger_item in target_triggers:
            if not isinstance(trigger_item, dict):
                continue
            
            print(f"Checking trigger: {trigger_item}")
            
            # Estrai l'entità dal trigger
            trigger_entity_id = trigger_item.get('entity_id')
            device_trigger = None
            
            if trigger_entity_id:
                if isinstance(device_action_source, str) and device_action_source == trigger_entity_id:
                    device_trigger = trigger_entity_id
                elif 'device_id' in trigger_item:
                    device_trigger = trigger_item['device_id']
            
            if not device_trigger and 'device_id' in trigger_item:
                device_trigger = trigger_item.get("device_id")
            
            if not device_trigger and trigger_entity_id:
                device_trigger = trigger_entity_id
            
            type_trigger = self.get_event_type(trigger_item)
            
            print(f"Trigger details: device={device_trigger}, type={type_trigger}")
            
            # Verifica match
            is_match = False
            if isinstance(device_action_source, list):
                if device_trigger in device_action_source:
                    is_match = True
            elif device_action_source == device_trigger:
                is_match = True
            
            # Normalizza i tipi per il confronto
            type_action_normalized = type_action_source.split('.')[-1] if '.' in type_action_source else type_action_source
            
            print(f"Match result: device_match={is_match}, type_check={self.check_operator(type_action_normalized, type_trigger)}")
            
            if is_match and self.check_operator(type_action_normalized, type_trigger):
                
                # Determina l'ordine corretto per la catena
                if direction == "rule1_to_rule2":
                    first_rule = source_rule
                    second_rule = target_rule
                    chain_direction = f"{source_rule.get('alias')} → {target_rule.get('alias')}"
                else:  # rule2_to_rule1
                    first_rule = target_rule  # rule1 (nuova)
                    second_rule = source_rule  # rule2 (esistente)
                    chain_direction = f"{source_rule.get('alias')} → {target_rule.get('alias')}"
                
                # Genera la soluzione
                solution_info = self.call_find_solution_llm(
                    first_rule.get("id"), first_rule.get("alias"), first_rule.get("description"),
                    second_rule.get("id"), second_rule.get("alias"), second_rule.get("description")
                )
                
                # Crea l'ID univoco della catena
                unique_id_chain = f"{first_rule.get('id')}_{second_rule.get('id')}"
                
                if not self.is_chain_present(rule_chain, unique_id_chain):
                    chain_data = {
                        "type": "direct-chain",
                        "unique_id": unique_id_chain,
                        "direction": direction,
                        "chain_description": chain_direction,
                        "rules": [
                            {
                                "id": first_rule.get("id"),
                                "name": first_rule.get("alias"),
                                "description": first_rule.get("description"),
                                "role": "trigger" if direction == "rule2_to_rule1" else "source"
                            },
                            {
                                "id": second_rule.get("id"),
                                "name": second_rule.get("alias"),
                                "description": second_rule.get("description"),
                                "role": "triggered" if direction == "rule2_to_rule1" else "target"
                            }
                        ],
                        "entity_involved": device_trigger,
                        "action_type": type_action_normalized,
                        "trigger_type": type_trigger,
                        "possibleSolutions": solution_info,
                    }
                    
                    rule_chain.append(chain_data)
                    return True
        
        return False
        
    def process_indirect_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2: Dict[str, Any],
                           action1_details: Dict[str, Any],
                           rule1_name: str, id_automation1: str,
                           rule2_entity_id: str):
    
        print(f"\n=== PROCESS_INDIRECT_CHAIN DEBUG ===")
        print(f"Rule1: {rule1_name} (ID: {id_automation1})")
        print(f"Rule2: {rule2.get('alias', 'No alias')} (ID: {rule2.get('id')})")
        
        # DIREZIONE 1: Rule1 → variabile → Rule2 (comportamento originale)
        self._check_indirect_chain_direction(rule_chain, rule1, rule2, action1_details, rule1_name, id_automation1, "rule1_to_rule2")
        
        # DIREZIONE 2: Rule2 → variabile → Rule1 (nuova funzionalità)
        self._check_indirect_chain_direction(rule_chain, rule2, rule1, None, rule1_name, id_automation1, "rule2_to_rule1")
    
    def _check_indirect_chain_direction(self, rule_chain: List[Dict[str, Any]], 
                                  source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                                  source_action_details: Dict[str, Any] = None,
                                  rule1_name: str = "", id_automation1: str = "",
                                  direction: str = ""):
        
        # Se non abbiamo i dettagli dell'azione (direzione 2), li calcoliamo
        if source_action_details is None:
            source_actions = source_rule.get("actions", []) or source_rule.get("action", [])
            if not isinstance(source_actions, list):
                source_actions = [source_actions]
            
            # Processa ogni azione della regola sorgente
            for source_action in source_actions:
                if not isinstance(source_action, dict):
                    continue
                
                device_action_source, _, domain_source = self.process_action_for_chain(source_action)
                type_action_source = self.get_event_type(source_action)
                
                source_action_details = {
                    'device_action': device_action_source,
                    'type_action': type_action_source,
                    'domain': domain_source
                }
                
                print(f"Source action details: {source_action_details}")
                
                # Controlla se questa azione può influenzare una variabile che triggera la regola target
                chain_found = self._check_indirect_variable_match(
                    rule_chain, source_rule, target_rule, source_action_details, 
                    rule1_name, id_automation1, direction
                )
                
                if chain_found:
                    break  # Una catena trovata è sufficiente
        else:
            # Direzione 1: usa i dettagli dell'azione già forniti
            self._check_indirect_variable_match(
                rule_chain, source_rule, target_rule, source_action_details, 
                rule1_name, id_automation1, direction
            )

    def _check_indirect_variable_match(self, rule_chain: List[Dict[str, Any]],
                                    source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                                    source_action_details: Dict[str, Any],
                                    rule1_name: str, id_automation1: str, direction: str) -> bool:
        
        type_action_source = source_action_details['type_action'].split('.')[-1] if '.' in source_action_details['type_action'] else source_action_details['type_action']
        domain_source = source_action_details['domain']

        if not domain_source:  # domain è essenziale per get_context_variables
            print("No domain found for source action")
            return False
        
        # Ottieni le variabili di contesto influenzate dall'azione sorgente
        context_var_action = self.get_context_variables(domain_source, type_action_source)
        print(f"Context variables from action: {context_var_action}")
        
        # Ottieni i trigger della regola target
        target_triggers = target_rule.get("triggers", []) or target_rule.get("trigger", [])
        if not isinstance(target_triggers, list):
            target_triggers = [target_triggers]

        if not target_triggers:
            print("No triggers in target rule")
            return False

        # Controlla ogni variabile influenzata dall'azione sorgente
        for var_type, variables in context_var_action.items():  # increase/decrease
            for variable in variables:  # e.g., "temperature", "humidity"
                print(f"Checking variable: {variable} ({var_type})")
                
                # Controlla ogni trigger della regola target
                for trigger_item in target_triggers:
                    if not isinstance(trigger_item, dict):
                        continue

                    entity_trigger = trigger_item.get("entity_id")
                    if not entity_trigger:
                        continue

                    _, device_class_trigger = self.process_trigger(entity_trigger)
                    print(f"Target trigger entity: {entity_trigger}, device_class: {device_class_trigger}")

                    if not device_class_trigger:  # Se non c'è device_class, non può matchare la variabile
                        continue
                    
                    # Verifica se la variabile influenzata dall'azione sorgente 
                    # corrisponde alla device_class del trigger target
                    if variable == device_class_trigger:

                        # Determina l'ordine corretto per la catena
                        if direction == "rule1_to_rule2":
                            first_rule = source_rule  # rule1 (nuova)
                            second_rule = target_rule  # rule2 (esistente)
                        else:  # rule2_to_rule1
                            first_rule = target_rule  # rule1 (nuova)
                            second_rule = source_rule  # rule2 (esistente)
                        
                        # Genera la soluzione
                        solution_info = self.call_find_solution_llm(
                            first_rule.get("id"), first_rule.get("alias"), first_rule.get("description"),
                            second_rule.get("id"), second_rule.get("alias"), second_rule.get("description")
                        )
                        
                        # Crea l'ID univoco della catena
                        unique_id_chain = f"{first_rule.get('id')}_{second_rule.get('id')}"
                        
                        if not self.is_chain_present(rule_chain, unique_id_chain):
                            chain_data = {
                                "type": "indirect-chain",
                                "unique_id": unique_id_chain,
                                "direction": direction,
                                "chain_variable": variable, 
                                "effect_type": var_type,  # e.g., "increase" or "decrease"
                                "rules": [
                                    {
                                        "id": first_rule.get("id"),
                                        "name": first_rule.get("alias"),
                                        "description": first_rule.get("description"),
                                        "role": "source" if direction == "rule1_to_rule2" else "trigger"
                                    },
                                    {
                                        "id": second_rule.get("id"),
                                        "name": second_rule.get("alias"),
                                        "description": second_rule.get("description"),
                                        "role": "target" if direction == "rule1_to_rule2" else "triggered"
                                    }
                                ],
                                "possibleSolutions": solution_info
                            }
                            
                            rule_chain.append(chain_data)
                            
                            return True  # Esci dopo aver trovato la prima catena indiretta
        
        return False

    def _process_rule_chain_iteration(self, all_existing_rules: List[Dict[str, Any]],
                                   rule1_config: Dict[str, Any],
                                   chain_processing_function: callable) -> List[Dict[str, Any]]:

        rule_chain_output = []
        
        rule1_alias = rule1_config.get("alias")
        if not rule1_alias:
            print("Rule 1 has no alias, skipping.")
            return [] # Or handle error appropriately

        entity_rule_name1 = "automation." + rule1_alias.replace(" ", "_")
        rule_name1 = rule1_alias
        id_automation1 = rule1_config.get("id")
        if id_automation1 is None:
            print("Rule 1 has no ID, skipping.")
            return []

        actions1 = rule1_config.get("actions", []) or rule1_config.get("action", [])
        if not isinstance(actions1, list): actions1 = [actions1] # Ensure it's a list

        for action1_config in actions1:
            if not isinstance(action1_config, dict): continue # Skip malformed actions

            device_action1, _, domain1 = self.process_action_for_chain(action1_config)
            type_action1 = self.get_event_type(action1_config)

            action1_details = {
                'device_action': device_action1,
                'type_action': type_action1,
                'domain': domain1
            }

            for rule2_wrapper in all_existing_rules:
                rule2_config = rule2_wrapper.get("config")
                if not rule2_config or not isinstance(rule2_config, dict):
                    continue

                rule2_alias = rule2_config.get("alias")
                if not rule2_alias: continue

                rule2_entity_id = "automation." + rule2_alias.replace(" ", "_")
                
                if entity_rule_name1 == rule2_entity_id:
                    continue
                
                chain_processing_function(
                    rule_chain_output, rule1_config, rule2_config, action1_details,
                    rule_name1, id_automation1, rule2_entity_id
                )
        
        #print("Detected chains:", rule_chain_output)
        return rule_chain_output

    def detect_chains(self, all_rules: List, automation_post_config: Dict[str, Any], chain_type: str = "indirect") \
                      -> List[Dict[str, Any]]:

        processing_function = self.process_indirect_chain
        if chain_type == "direct":
            processing_function = self.process_direct_chain
        elif chain_type != "indirect":
            raise ValueError(f"Unknown chain_type: {chain_type}. Must be 'direct' or 'indirect'.")

        return self._process_rule_chain_iteration(
            all_existing_rules=all_rules,
            rule1_config=automation_post_config,
            chain_processing_function=processing_function
        )

# Example usage (to be adapted or moved to a test/main script)
if __name__ == "__main__":
    # Configuration - should come from a config file or environment variables
    HA_BASE_URL = "http://luna.isti.cnr.it:8123" # Example
    HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk" # Example
    LIST_DEVICES_PATH = 'C:/Users/andre/Programmazione/CASPER ENV/CASPER/gpt_server/problems/list_devices_variables.json' # Example

    #user_id="681e05bfd5c21048c157e431"
    user_id="682c59206a47b8e0ef343796"
    # Instantiate the client and detector
    ha_client = HomeAssistantClient(base_url=HA_BASE_URL, token=HA_TOKEN) # Modificato per usare il client importato
    # The _db module needs to be accessible here. For a standalone script, you might need to mock it
    # or ensure the script is run in an environment where `from .. import db_functions as _db` works.
    # For this example, I'll assume _db is available.
    try:
        from .. import db_functions as _db_module # Corretto l'import per coerenza
    except ImportError:
        # Mock _db if running standalone and .. import fails
        class MockDb:
            def get_automations(self, user_id):
                print(f"MockDb: Called get_automations for user {user_id}")
                return [
                    {"config": {
                        "id": "2",
                        "alias": "Spegni presa Ventilatore quando si accende Lampadina Sara",
                        "description": "Evento: quando la lampadina Lampadina_Sara viene accesa (light.lampadina_sara1). Condizione: nessuna. Azione: spegni la presa Ventilatore (switch.presa_ventilatore).",
                        "triggers": [{"platform": "state", "entity_id": "light.lampadina_sara1", "to": "on"}],
                        "condition": [],
                        "actions": [{"service": "switch.turn_off", "target": {"entity_id": "switch.presa_ventilatore"}}]
                    }, "user_id": user_id},
                    {"config": {
                        "id": "3",
                        "alias": "Dummy rule if light sara turns on",
                        "description": "Another rule triggered by light.lampadina_sara1",
                        "triggers": [{"platform": "state", "entity_id": "light.lampadina_sara1", "to": "on"}],
                        "condition": [],
                        "actions": [{"service": "notify.notify", "data": {"message": "Light Sara turned on!"}}]
                    }, "user_id": user_id},
                    {"config": {
                        "id": "4",
                        "alias": "Dummy rule if light sara turns off",
                        "description": "A rule INDIRECTLY triggered by light.lampadina_sara1",
                        "triggers": [{"platform": "numeric_state", "entity_id": "sensor.shellymotion2_8cf681e3ca82_luminosity", "below": "50"}],
                        "condition": [],
                        "actions": [{"service": "notify.notify", "data": {"message": "Light Sara turned off!"}}]
                    }, "user_id": user_id}
                ]
        _db_module = MockDb()
        print("Used MockDb as relative import failed (likely running standalone).")


    detector = ChainsDetector(ha_client=ha_client,
                              list_devices_variables_path=LIST_DEVICES_PATH,
                              db_module=_db_module,
                              user_id=DB_USER_ID
                              )

    current_automation_config = {
        "alias": "Accendi la lampadina Sara quando piove fuori casa",
        "description": "Evento: quando fuori casa piove (weather.forecast_casa). Azione: accendi Lampadina_Sara (light.lampadina_sara1).",
        "trigger": [ 
          {
            "platform": "state",
            "entity_id": "weather.forecast_casa",
            "to": "rainy"
          }
        ],
        "condition": [],
        "actions": [ 
          {
            "service": "light.turn_on",
            "target": {
              "entity_id": "light.lampadina_sara1"
            }
          }
        ],
        "id": "1"
    }
    current_automation_description = "Evento: quando fuori casa piove (weather.forecast_casa). Azione: accendi Lampadina_Sara (light.lampadina_sara1)."

    print("\\n--- Detecting Direct Chains ---")
    direct_chains = detector.detect_chains(
        automation_post_config=current_automation_config,
        chain_type="direct"
    )

    print("\\n--- Detecting Indirect Chains ---")
    indirect_chains = detector.detect_chains(
        automation_post_config=current_automation_config,
        chain_type="indirect"
    )
