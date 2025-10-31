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

    # Search for the entity ID of the automation based on the ID of the automation's 'attributes' element
    @staticmethod
    def find_automation_entity_id(all_states_data: List[Dict[str, Any]], automation_id: str) -> str | None:
        for item in all_states_data:
            if 'attributes' in item and item['attributes'].get('id') == automation_id:
                return item.get('entity_id')
        return None

    def get_event_type(self, e: Dict[str, Any]) -> str:
        type_event = e.get('type') or e.get("type_action")
        service = e.get("service")
        if(e.get("platform") == "state"):
            type_event = e.get("to")
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
            action_val = e.get("action")
            if action_val is not None:
                type_event = action_val.split('.')[-1]
        if type_event is None:
            trigger = e.get("trigger")
            type_event = trigger
        if type_event is None:
            type_event = e.get("to")
            type_event = "turned_on" if type_event == "on" else "turned_off"
        return type_event if type_event is not None else "unknown"

    def check_operator(self, type1: str, type2: str) -> bool:
        if not type1 or not type2:
            return False
        t1 = str(type1).lower()
        t2 = str(type2).lower()

        if t1 == t2:
            return True

        equivalents = {
            "turn_on": {"turned_on", "turn_on", "on"},
            "turn_off": {"turned_off", "turn_off", "off"},
            "close": {"closed", "close", "close_cover"},
            "open": {"opened", "open", "open_cover"},
            "close_cover": {"close", "closed", "close_cover"},
            "open_cover": {"open", "opened", "open_cover"},
            "closed": {"close", "close_cover", "closed"},
            "opened": {"open", "open_cover", "opened"}
        }

        if t1 in equivalents and t2 in equivalents[t1]:
            return True
        if t2 in equivalents and t1 in equivalents[t2]:
            return True

        return False

    def is_chain_present(self, chain_array: List[Dict[str, Any]], unique_id: str, chain_direction: str) -> bool:
        for chain in chain_array:
            if chain.get("unique_id") == unique_id and chain.get("description") == chain_direction:
                return True
        return False

    def get_device_id(self, action) -> str | List[str] | None:
        target = action.get("target", {})
        device_id = action.get("device_id") or target.get("device_id") or \
                    action.get("entity_id") or target.get("entity_id")
        if not device_id:
            return None
        # If it's already a list, normalize elements to strings
        if isinstance(device_id, list):
            cleaned = []
            for d in device_id:
                if d is None:
                    continue
                ds = str(d).strip()
                ds = re.sub(r'^[\[\]\'"]+|[\[\]\'"]+$', '', ds)
                if ds:
                    cleaned.append(ds)
            return cleaned if cleaned else None

        # Normalize string: remove surrounding brackets/quotes then split by comma if present
        ds = str(device_id).strip()
        ds = re.sub(r'^[\[\]\'"]+|[\[\]\'"]+$', '', ds)

        if ',' in ds:
            items = [itm.strip() for itm in ds.split(',') if itm.strip()]
            return items if items else None

        return ds if ds else None

    def extract_all_actions(self, actions, _depth=0, _max_depth=10):
        """
        Recursively extract all actions from nested structures like 'choose', 'if', etc.
        Returns a list of all atomic actions found.
        """
        if _depth > _max_depth:
            print(f"Warning: Maximum recursion depth reached in extract_all_actions")
            return []
            
        all_actions = []
        
        for action in actions:
            # Handle 'choose' actions
            if "choose" in action:
                for choice in action["choose"]:
                    if "sequence" in choice:
                        all_actions.extend(self.extract_all_actions(choice["sequence"], _depth + 1, _max_depth))
                # Handle default sequence if present
                if "default" in action:
                    all_actions.extend(self.extract_all_actions(action["default"], _depth + 1, _max_depth))
            
            # Handle 'if' actions
            elif "if" in action:
                if "then" in action:
                    all_actions.extend(self.extract_all_actions(action["then"], _depth + 1, _max_depth))
                if "else" in action:
                    all_actions.extend(self.extract_all_actions(action["else"], _depth + 1, _max_depth))
            
            # Handle 'repeat' actions
            elif "repeat" in action and "sequence" in action:
                all_actions.extend(self.extract_all_actions(action["sequence"], _depth + 1, _max_depth))
            
            # Handle 'parallel' actions
            elif "parallel" in action:
                for parallel_sequence in action["parallel"]:
                    if "sequence" in parallel_sequence:
                        all_actions.extend(self.extract_all_actions(parallel_sequence["sequence"], _depth + 1, _max_depth))
            
            # This is an atomic action
            else:
                all_actions.append(action)
        
        return all_actions

    def process_action(self, action):
        """Process action and extract relevant information"""
        if isinstance(action, str):
            return None, None, None, None
        
        # Handle nested actions - extract all atomic actions
        if isinstance(action, dict) and any(key in action for key in ["choose", "if", "repeat", "parallel"]):
            return self.extract_all_actions([action]), None, None, None
        
        # Handle atomic actions
        device_id = self.get_device_id(action)
        service = action.get("service")
        action_field = action.get("action")
        
        # Determine domain from service or action
        domain = None
        if service:
            domain = service.split('.')[0]
        elif action_field:
            domain = action_field.split('.')[0]
            
        has_attrs = action.get("data", {}) or action.get("data_template", {})
        area_id = action.get("target", {}).get("area_id")

        if (area_id == None):
            if device_id is None:
                device_id = action.get("service")
            #TODO: da gestire array di ID
            if isinstance(device_id, list):
                return device_id, area_id, has_attrs, domain
            if(device_id is None):
                return device_id, area_id, has_attrs, domain
            area_id = self.ha_client.getRoomDevice(device_id)  
            if area_id is None or area_id == "None":
                area_id = "Sconosciuto"

        return device_id, area_id, has_attrs, domain

    def get_devices_ids_from_entity_ids(self, entity_ids: List[str]) -> List[str]:
        return [self.ha_client.get_device_id_from_entity_id(e) for e in entity_ids]

    def process_action_for_chain(self, action: Dict[str, Any]) -> Tuple[str | List[str] | None, str | None, str | None]:
        # Handle nested actions
        if isinstance(action, dict) and any(key in action for key in ["choose", "if", "repeat", "parallel"]):
            atomic_actions = self.extract_all_actions([action])
            # For chain processing, we'll process each atomic action separately
            # Return the first atomic action's details for now
            if atomic_actions:
                first_atomic_action = atomic_actions[0]
                device_action, area_action, _, domain_action = self.process_action(first_atomic_action)
                if not device_action and area_action and domain_action:
                    entities_by_domain_and_area = self.ha_client.get_entities_by_domain_and_area(area_action, domain_action)
                    if entities_by_domain_and_area:
                        device_action = self.get_devices_ids_from_entity_ids(entities_by_domain_and_area)
                return device_action, area_action, domain_action
            else:
                return None, None, None
        
        # Handle atomic actions
        device_action, area_action, _, domain_action = self.process_action(action)
        if not device_action and area_action and domain_action:
            entities_by_domain_and_area = self.ha_client.get_entities_by_domain_and_area(area_action, domain_action)
            if entities_by_domain_and_area:
                device_action = self.get_devices_ids_from_entity_ids(entities_by_domain_and_area)
        return device_action, area_action, domain_action

    def process_trigger(self, entity_trigger: str | List[str]) -> Tuple[str | None, str | None]:
        first_entity_id = entity_trigger[0] if isinstance(entity_trigger, list) and entity_trigger else entity_trigger
        
        if not isinstance(first_entity_id, str):
            return None, None, None

        device_trigger = self.ha_client.get_device_id_from_entity_id(first_entity_id)
        device_class_trigger = self.ha_client.get_device_class_by_entity_id(first_entity_id)
        area_trigger = self.ha_client.getRoomDevice(first_entity_id)
        return device_trigger, device_class_trigger, area_trigger
        

    def get_context_variables(self, action_domain: str, event_type: str) -> OrderedDict:
        domain_data = self.list_devices_variables.get("list_of_domains", {}).get(action_domain, {})
        for item in domain_data.get("possibleValues", []):
            if self.check_operator(item.get("value"), event_type):
                return OrderedDict([
                    ("decrease", item.get("decrease_variable", [])),
                    ("increase", item.get("increase_variable", []))
                ])
        return OrderedDict([("decrease", []), ("increase", [])])

    def call_find_solution_llm(self, idAutomation1: str, idAutomation2: str, ruleName1: str, ruleName2: str, automation1_description: str, automation2_description: str):  
        formatted_prompt = prompts.recommender_chains.format(
                home_devices=_db.get_devices(self.user_id),
            )
        messages = [
            SystemMessage(formatted_prompt),
            HumanMessage(f"Generate a solution for the chain activation between the following automations:\n{ruleName1}(id {idAutomation1}): {automation1_description}\n{ruleName2}(id {idAutomation2}):{automation2_description}"),
        ]
        structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
        data = structured_response.invoke(messages)
        return data

    def process_direct_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2,
                         action1_details: Dict[str, Any], 
                         rule1_name: str, id_automation1: str,
                         rule2_entity_id: str, state: str = None):
        
        # DIREZIONE 1: Rule1 → Rule2 
        self._check_chain_direction(rule_chain, rule1, rule2, action1_details, rule1_name, id_automation1, "rule1_to_rule2", state)
        
        # DIREZIONE 2: Rule2 → Rule1
        self._check_chain_direction(rule_chain, rule2, rule1, None, rule1_name, id_automation1, "rule2_to_rule1", state)

    def _check_chain_direction(self, rule_chain: List[Dict[str, Any]], 
                          source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                          source_action_details: Dict[str, Any] = None,
                          rule1_name: str = "", id_automation1: str = "",
                          direction: str = "",
                          state: str = None):
    
        # Se non abbiamo i dettagli dell'azione (direzione 2), li calcoliamo
        if source_action_details is None:
            source_actions = source_rule.get("actions", []) or source_rule.get("action", [])
            if not isinstance(source_actions, list):
                source_actions = [source_actions]
            
            # Extract all atomic actions from nested structures
            all_atomic_actions = []
            for source_action in source_actions:
                if not isinstance(source_action, dict):
                    continue
                atomic_actions = self.extract_all_actions([source_action])
                all_atomic_actions.extend(atomic_actions)
            
            # Processa ogni azione atomica della regola sorgente
            for atomic_action in all_atomic_actions:
                device_action_source, area_source, domain_source = self.process_action_for_chain(atomic_action)
                type_action_source = self.get_event_type(atomic_action)
                
                source_action_details = {
                    'device_action': device_action_source,
                    'type_action': type_action_source,
                    'domain': domain_source,
                    'area': area_source
                }

                # Controlla se questa azione può triggerare la regola target
                chain_found = self._check_action_trigger_match(
                    rule_chain, source_rule, target_rule, source_action_details, 
                    rule1_name, id_automation1, direction, state
                )
                
                if chain_found:
                    break  # Una catena trovata è sufficiente
        else:
            # Direzione 1: usa i dettagli dell'azione già forniti
            self._check_action_trigger_match(
                rule_chain, source_rule, target_rule, source_action_details, 
                rule1_name, id_automation1, direction, state
            )
    
    def _check_action_trigger_match(self, rule_chain: List[Dict[str, Any]],
                               source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                               source_action_details: Dict[str, Any],
                               rule1_name: str, id_automation1: str, direction: str, state) -> bool:

        device_action_source = source_action_details['device_action']
        type_action_source = source_action_details['type_action']
        
        # Ottieni i trigger della regola target
        target_triggers = target_rule.get("triggers", []) or target_rule.get("trigger", [])
        if not isinstance(target_triggers, list):
            target_triggers = [target_triggers]
        
        if not target_triggers:
            return False
        
        for trigger_item in target_triggers:
            if not isinstance(trigger_item, dict):
                continue
            
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
            
            # Verifica match
            is_match = False
            if device_trigger is not None and device_action_source is not None:
                if isinstance(device_action_source, list):
                    if device_trigger in device_action_source:
                        is_match = True
                elif device_action_source == device_trigger:
                    is_match = True
            
            # Normalizza i tipi per il confronto
            type_action_normalized = type_action_source.split('.')[-1] if '.' in type_action_source else type_action_source
            
            if is_match and self.check_operator(type_action_normalized, type_trigger):
                    
                chain_direction = f"{source_rule.get('alias')} → {target_rule.get('alias')}"

                # Genera la soluzione 
                solution_info = self.call_find_solution_llm(
                    source_rule.get("id"),
                    target_rule.get("id"),
                    source_rule.get("alias"),
                    target_rule.get("alias"),
                    source_rule.get("description"),
                    target_rule.get("description")
                )
                
                # Crea l'ID univoco della catena
                unique_id_chain = f"{source_rule.get('id')}_{target_rule.get('id')}"

                if not self.is_chain_present(rule_chain, unique_id_chain, chain_direction):
                    chain_data = {
                        "type": "direct-chain",
                        "unique_id": unique_id_chain,
                        "direction": direction,
                        "chain_description": chain_direction,
                        "rules": [
                            {
                                "id": source_rule.get("id"),
                                "name": source_rule.get("alias"),
                                "description": source_rule.get("description"),
                                "role": "trigger" if direction == "rule2_to_rule1" else "source"
                            },
                            {
                                "id": target_rule.get("id"),
                                "name": target_rule.get("alias"),
                                "description": target_rule.get("description"),
                                "role": "triggered" if direction == "rule2_to_rule1" else "target"
                            }
                        ],
                        "entity_involved": device_trigger,
                        "action_type": type_action_normalized,
                        "trigger_type": type_trigger,
                        "possibleSolutions": solution_info,
                        "state": state
                    }
                    
                    rule_chain.append(chain_data)
                    return True
        
        return False
        
    def process_indirect_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2: Dict[str, Any],
                           action1_details: Dict[str, Any],
                           rule1_name: str, id_automation1: str,
                           rule2_entity_id: str, state: str = None):

        # DIREZIONE 1: Rule1 → variabile → Rule2 (comportamento originale)
        self._check_indirect_chain_direction(rule_chain, rule1, rule2, action1_details, rule1_name, id_automation1, "rule1_to_rule2", state)
        
        # DIREZIONE 2: Rule2 → variabile → Rule1 (nuova funzionalità)
        self._check_indirect_chain_direction(rule_chain, rule2, rule1, None, rule1_name, id_automation1, "rule2_to_rule1", state)
    
    def _check_indirect_chain_direction(self, rule_chain: List[Dict[str, Any]], 
                                  source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                                  source_action_details: Dict[str, Any] = None,
                                  rule1_name: str = "", id_automation1: str = "",
                                  direction: str = "",
                                  state: str = None):

        # Se non abbiamo i dettagli dell'azione (direzione 2), li calcoliamo
        if source_action_details is None:
            source_actions = source_rule.get("actions", []) or source_rule.get("action", [])
            if not isinstance(source_actions, list):
                source_actions = [source_actions]
            
            # Extract all atomic actions from nested structures
            all_atomic_actions = []
            for source_action in source_actions:
                if not isinstance(source_action, dict):
                    continue
                atomic_actions = self.extract_all_actions([source_action])
                all_atomic_actions.extend(atomic_actions)
            
            # Processa ogni azione atomica della regola sorgente
            for atomic_action in all_atomic_actions:
                device_action_source, area_source, domain_source = self.process_action_for_chain(atomic_action)
                type_action_source = self.get_event_type(atomic_action)
                
                source_action_details = {
                    'device_action': device_action_source,
                    'type_action': type_action_source,
                    'domain': domain_source,
                    'area': area_source
                }
                
                # Controlla se questa azione può influenzare una variabile che triggera la regola target
                chain_found = self._check_indirect_variable_match(
                    rule_chain, source_rule, target_rule, source_action_details, 
                    rule1_name, id_automation1, direction, state
                )
                
                if chain_found:
                    break  # Una catena trovata è sufficiente
        else:
            # Direzione 1: usa i dettagli dell'azione già forniti
            self._check_indirect_variable_match(
                rule_chain, source_rule, target_rule, source_action_details, 
                rule1_name, id_automation1, direction, state
            )

    def _check_indirect_variable_match(self, rule_chain: List[Dict[str, Any]],
                                    source_rule: Dict[str, Any], target_rule: Dict[str, Any],
                                    source_action_details: Dict[str, Any],
                                    rule1_name: str, id_automation1: str, direction: str, state) -> bool:

        type_action_source = source_action_details['type_action'].split('.')[-1] if '.' in source_action_details['type_action'] else source_action_details['type_action']
        domain_source = source_action_details['domain']
        area_source = source_action_details['area']

        if not domain_source:
            return False
        
        # Ottieni le variabili di contesto influenzate dall'azione sorgente
        context_var_action = self.get_context_variables(domain_source, type_action_source)
        
        # Ottieni i trigger della regola target
        target_triggers = target_rule.get("triggers", []) or target_rule.get("trigger", [])
        if not isinstance(target_triggers, list):
            target_triggers = [target_triggers]

        if not target_triggers:
            return False

        # Controlla ogni variabile influenzata dall'azione sorgente
        for var_type, variables in context_var_action.items():  # increase/decrease
            for variable in variables:  # e.g., "temperature", "humidity"
                
                # Controlla ogni trigger della regola target
                for trigger_item in target_triggers:
                    if not isinstance(trigger_item, dict):
                        continue

                    entity_trigger = trigger_item.get("entity_id")
                    if not entity_trigger:
                        continue

                    _, device_class_trigger, area_trigger = self.process_trigger(entity_trigger)

                    if not device_class_trigger:
                        continue
                    
                    print("#############################################")
                    print("AUTOMAZIONE 1", rule1_name)
                    print("AUTOMAZIONE 2", target_rule.get("alias"))
                    print("STANZA TRIGGER TARGET:", area_trigger)
                    print("STANZA AZIONE SORGENTE:", area_source)

                    if area_source is not None or area_trigger is not None:
                        if area_source != area_trigger:
                            continue
                    
                    # Verifica se la variabile influenzata dall'azione sorgente 
                    # corrisponde alla device_class del trigger target
                    if variable == device_class_trigger:

                        chain_direction = f"{source_rule.get('alias')} → {target_rule.get('alias')}"
                        
                        # Genera la soluzione
                        solution_info = self.call_find_solution_llm(
                            source_rule.get("id"), source_rule.get("alias"), source_rule.get("description"),
                            target_rule.get("id"), target_rule.get("alias"), target_rule.get("description")
                        )
                        
                        # Crea l'ID univoco della catena
                        unique_id_chain = f"{source_rule.get('id')}_{target_rule.get('id')}"
                        
                        if not self.is_chain_present(rule_chain, unique_id_chain, chain_direction):
                            print("---------TROVATA CATENA")
                            print("#############################################")
                            chain_data = {
                                "type": "indirect-chain",
                                "unique_id": unique_id_chain,
                                "direction": direction,
                                "chain_variable": variable,
                                "chain_description": chain_direction, 
                                "effect_type": var_type,
                                "rules": [
                                    {
                                        "id": source_rule.get("id"),
                                        "name": source_rule.get("alias"),
                                        "description": source_rule.get("description"),
                                        "role": "source" if direction == "rule1_to_rule2" else "trigger"
                                    },
                                    {
                                        "id": target_rule.get("id"),
                                        "name": target_rule.get("alias"),
                                        "description": target_rule.get("description"),
                                        "role": "target" if direction == "rule1_to_rule2" else "triggered"
                                    }
                                ],
                                "possibleSolutions": solution_info,
                                "state": state
                            }
                            
                            rule_chain.append(chain_data)
                            
                            return True
        
        return False

    def _process_rule_chain_iteration(self, all_existing_rules: List[Dict[str, Any]],
                                   rule1_config: Dict[str, Any],
                                   chain_processing_function: callable) -> List[Dict[str, Any]]:

        rule_chain_output = []
        
        rule1_alias = rule1_config.get("alias")
        if not rule1_alias:
            return []

        entity_rule_name1 = "automation." + rule1_alias.replace(" ", "_")
        rule_name1 = rule1_alias
        id_automation1 = rule1_config.get("id")
        if id_automation1 is None:
            return []

        actions1 = rule1_config.get("actions", []) or rule1_config.get("action", [])
        if not isinstance(actions1, list): 
            actions1 = [actions1]

        # Extract all atomic actions from nested structures
        all_atomic_actions = []
        for action1_config in actions1:
            if not isinstance(action1_config, dict): 
                continue
            atomic_actions = self.extract_all_actions([action1_config])
            all_atomic_actions.extend(atomic_actions)

        for atomic_action in all_atomic_actions:
            device_action1, _, domain1 = self.process_action_for_chain(atomic_action)
            type_action1 = self.get_event_type(atomic_action)

            action1_details = {
                'device_action': device_action1,
                'type_action': type_action1,
                'domain': domain1
            }

            for rule2_wrapper in all_existing_rules:
                state = rule2_wrapper.get("state", None)
                rule2_config = rule2_wrapper.get("config")
                if not rule2_config or not isinstance(rule2_config, dict):
                    continue

                rule2_alias = rule2_config.get("alias")
                if not rule2_alias: 
                    continue

                rule2_entity_id = "automation." + rule2_alias.replace(" ", "_")
                
                if entity_rule_name1 == rule2_entity_id:
                    continue
                
                chain_processing_function(
                    rule_chain_output, rule1_config, rule2_config, action1_details,
                    rule_name1, id_automation1, rule2_entity_id, state
                )
        
        return rule_chain_output

    def detect_chains(self, all_rules: List, automation: str | Dict[str, Any], chain_type: str = "indirect") \
                      -> List[Dict[str, Any]]:

        processing_function = self.process_indirect_chain
        if chain_type == "direct":
            processing_function = self.process_direct_chain
        elif chain_type != "indirect":
            raise ValueError(f"Unknown chain_type: {chain_type}. Must be 'direct' or 'indirect'.")

        if automation == "all_rules":
            # Analyze all automations for chains between them
            rule_chain_output = []
            for i, rule1 in enumerate(all_rules):
                for j, rule2 in enumerate(all_rules):
                    if i != j:  # Avoid comparing the same rule with itself
                        result = self._process_rule_chain_iteration(
                            all_existing_rules=[rule2],
                            rule1_config=rule1.get("config"),
                            chain_processing_function=processing_function
                        )
                        rule_chain_output.extend(result)
            return rule_chain_output
        else:
            # Analyze chains for a single automation
            rule_chain_output = self._process_rule_chain_iteration(
                all_existing_rules=all_rules,
                rule1_config=automation,
                chain_processing_function=processing_function
            )
            return rule_chain_output

# Example usage
if __name__ == "__main__":
    # Configuration
    HA_BASE_URL = "http://192.168.0.10:8123"
    HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI5OTExYzg0ZDkzYmE0MGM1Yjk3NzMzNGMzYTU4NzNkYSIsImlhdCI6MTc1OTkxMzgyMywiZXhwIjoyMDc1MjczODIzfQ.MxA-KCc-4qC4dzg4V9ngtPb9Pq35FG2G5xkvfOz6f3M"
    
    user_id = "681dc95bd86883dcc0eeebad"
    
    # Instantiate the client and detector
    ha_client = HomeAssistantClient(base_url=HA_BASE_URL, token=HA_TOKEN)
    
    # Mock _db if needed
    try:
        import db_functions as _db_module
    except ImportError:
        class MockDb:
            def get_automations(self, user_id):
                return  [
                    {
                        "config": {
                            "alias": "Gestione automatica del Purificatore Air Purifier in base a PM2,5 e CO2",
                            "description": "Evento: Le polveri sottili superano 35 µg/m³ (sensor.pm25) OPPURE l'anidride carbonica in salotto supera 1000 ppm (sensor.co2_salotto).\n\nAzione: Accende il Purificatore Air Purifier (fan.xiaomi_cpa4_a885_air_purifier_2).\n\nEvento: Le polveri sottili scendono sotto 10 µg/m³ (sensor.pm25) E l'anidride carbonica scende sotto 600 ppm (sensor.co2_salotto).\n\nAzione: Spegne il Purificatore Air Purifier (fan.xiaomi_cpa4_a885_air_purifier_2).",
                            "triggers": [
                                {
                                "entity_id": "sensor.xiaomi_cpa4_a885_pm25_density_2",
                                "above": 35,
                                "trigger": "numeric_state"
                                },
                                {
                                "entity_id": "sensor.sensore_netatmo_anidride_carbonica",
                                "above": 1000,
                                "trigger": "numeric_state"
                                },
                                {
                                "entity_id": "sensor.xiaomi_cpa4_a885_pm25_density_2",
                                "below": 10,
                                "trigger": "numeric_state"
                                },
                                {
                                "entity_id": "sensor.sensore_netatmo_anidride_carbonica",
                                "below": 600,
                                "trigger": "numeric_state"
                                }
                            ],
                            "conditions": [
                                {
                                "condition": "or",
                                "conditions": [
                                    {
                                    "condition": "numeric_state",
                                    "entity_id": "sensor.xiaomi_cpa4_a885_pm25_density_2",
                                    "above": 35
                                    },
                                    {
                                    "condition": "numeric_state",
                                    "entity_id": "sensor.sensore_netatmo_anidride_carbonica",
                                    "above": 1000
                                    }
                                ]
                                },
                                {
                                "condition": "and",
                                "conditions": [
                                    {
                                    "condition": "numeric_state",
                                    "entity_id": "sensor.xiaomi_cpa4_a885_pm25_density_2",
                                    "below": 10
                                    },
                                    {
                                    "condition": "numeric_state",
                                    "entity_id": "sensor.sensore_netatmo_anidride_carbonica",
                                    "below": 600
                                    }
                                ]
                                }
                            ],
                            "actions": [
                                {
                                "choose": [
                                    {
                                    "conditions": [
                                        {
                                        "condition": "or",
                                        "conditions": [
                                            {
                                            "condition": "numeric_state",
                                            "entity_id": "sensor.xiaomi_cpa4_a885_pm25_density_2",
                                            "above": 35
                                            },
                                            {
                                            "condition": "numeric_state",
                                            "entity_id": "sensor.sensore_netatmo_anidride_carbonica",
                                            "above": 1000
                                            }
                                        ]
                                        }
                                    ],
                                    "sequence": [
                                        {
                                        "data": {},
                                        "target": {
                                            "entity_id": "fan.xiaomi_cpa4_a885_air_purifier_2"
                                        },
                                        "action": "fan.turn_on"
                                        }
                                    ]
                                    },
                                    {
                                    "conditions": [
                                        {
                                        "condition": "and",
                                        "conditions": [
                                            {
                                            "condition": "numeric_state",
                                            "entity_id": "sensor.xiaomi_cpa4_a885_pm25_density_2",
                                            "below": 10
                                            },
                                            {
                                            "condition": "numeric_state",
                                            "entity_id": "sensor.sensore_netatmo_anidride_carbonica",
                                            "below": 600
                                            }
                                        ]
                                        }
                                    ],
                                    "sequence": [
                                        {
                                        "data": {},
                                        "target": {
                                            "entity_id": "fan.xiaomi_cpa4_a885_air_purifier_2"
                                        },
                                        "action": "fan.turn_off"
                                        }
                                    ]
                                    }
                                ]
                                }
                            ]
                        }
                    }
                ]
        _db_module = MockDb()

    detector = ChainsDetector(ha_client=ha_client, user_id=user_id)

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

    print("\n--- Detecting Direct Chains ---")
    direct_chains = detector.detect_chains(
        all_rules=[],
        automation=current_automation_config,
        chain_type="direct"
    )

    print("\n--- Detecting Indirect Chains ---")
    indirect_chains = detector.detect_chains(
        all_rules=[],
        automation=current_automation_config,
        chain_type="indirect"
    )