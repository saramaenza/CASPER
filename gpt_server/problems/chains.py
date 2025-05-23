import json
import re
from typing import List, Dict, Any, Tuple
from collections import OrderedDict
from list_devices_variables import list_devices
# Importa HomeAssistantClient dal nuovo file
from ha_client import HomeAssistantClient

class ChainsDetector:
    def __init__(self, ha_client: HomeAssistantClient):
        self.ha_client = ha_client
        self.list_devices_variables = list_devices
        # self.all_ha_states = self._initialize_states() # Removed global states, fetch when needed or pass if required by many methods

    # def _initialize_states(self) -> List[Dict[str, Any]]: # Changed from global
    #     states_str = self.ha_client.get_all_states()
    #     try:
    #         return json.loads(states_str)
    #     except json.JSONDecodeError:
    #         # Log error or raise
    #         return []

    def _load_devices_variables(self) -> Dict[str, Any]:
        # with open('C:\\LaboratorySite\\www\\demo\\explaintap\\main\\list_devices_variables.json', 'r') as file:
        with open('list_devices_variables.json', 'r') as file:
            return json.load(file)

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
        type_event = e.get('type')
        service = e.get("service")
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
        return (type1 == "turn_on" and type2 == "turned_on") or \
               (type1 == "turn_off" and type2 == "turned_off") or \
               (type1 == type2)

    def is_chain_present(self, chain_array: List[Dict[str, Any]], id_chain: str) -> bool:
        for chain in chain_array:
            if chain.get("id_chain") == id_chain:
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
            if item.get("value") == event_type:
                return OrderedDict([
                    ("decrease", item.get("decrease_variable", [])),
                    ("increase", item.get("increase_variable", []))
                ])
        return OrderedDict([("decrease", []), ("increase", [])])

    def process_direct_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2: Dict[str, Any],
                             action1_details: Dict[str, Any], # Contains device_action1, type_action1 etc.
                             rule1_name: str, id_automation1: str,
                             rule2_entity_id: str): # domain1 is part of action1_details if needed

        device_action1 = action1_details['device_action']
        type_action1 = action1_details['type_action']

        trigger2_list = rule2.get("triggers", []) or rule2.get("trigger", []) # Ensure it's a list
        if not isinstance(trigger2_list, list): trigger2_list = [trigger2_list] # if it's a single dict

        if not trigger2_list:
            return

        for trigger2_item in trigger2_list: # Iterate through all triggers of rule2
            if not isinstance(trigger2_item, dict): continue # Skip if trigger is not a dict

            # Original code took device_id from trigger, then entity_id if device_id was None.
            # Let's try to get entity_id first as it's more common for state triggers.
            # This part might need refinement based on what device_action1 actually holds.
            trigger_entity_id = trigger2_item.get('entity_id')
            device_trigger2 = None
            if trigger_entity_id:
                if isinstance(device_action1, str) and device_action1 == trigger_entity_id:
                     device_trigger2 = trigger_entity_id
                elif 'device_id' in trigger2_item:
                     device_trigger2 = trigger2_item['device_id']

            if not device_trigger2 and 'device_id' in trigger2_item: # Fallback to device_id if entity_id not matched
                 device_trigger2 = trigger2_item.get("device_id")
            
            if not device_trigger2 and trigger_entity_id: # If action was by entity, trigger might be by entity
                device_trigger2 = trigger_entity_id

            type_trigger2 = self.get_event_type(trigger2_item)

            is_match = False
            if isinstance(device_action1, list):
                if device_trigger2 in device_action1:
                    is_match = True
            elif device_action1 == device_trigger2:
                is_match = True
            
            if is_match and self.check_operator(type_action1, type_trigger2):
                solution_info = "" # Placeholder for call_find_solution_direct_chain
                
                rule_name2 = rule2.get("alias")
                id_automation2 = rule2.get("id")
                unique_id_chain = str(id_automation1) + "_" + str(id_automation2)

                if not self.is_chain_present(rule_chain, unique_id_chain):
                    rule_chain.append({
                        "type": "direct-chain",
                        "unique_id": unique_id_chain,
                        "rules": [
                            {
                                "id": id_automation1,
                                "name": rule1_name,
                                "description": rule1.get("description"),
                            },
                            {
                                "id": id_automation2,
                                "name": rule_name2,
                                "description": rule2.get("description"),
                            }
                        ],
                        "possibleSolutions": solution_info,
                    })
                    break # Assuming one match per rule2 is sufficient for "direct chain"

    def process_indirect_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2: Dict[str, Any],
                               action1_details: Dict[str, Any],
                                rule1_name: str, id_automation1: str,
                               rule2_entity_id: str):
        
        type_action1 = action1_details['type_action']
        domain1 = action1_details['domain']

        if not domain1: # domain1 is essential for get_context_variables
            return

        context_var_action = self.get_context_variables(domain1, type_action1)
        
        trigger2_list = rule2.get("triggers", []) or rule2.get("trigger", [])
        if not isinstance(trigger2_list, list): trigger2_list = [trigger2_list]

        if not trigger2_list:
            return

        for variables_type in context_var_action.values(): # increase/decrease
            for variable in variables_type: # e.g., "temperature", "humidity"
                for trigger2_item in trigger2_list:
                    if not isinstance(trigger2_item, dict): continue

                    entity_trigger2 = trigger2_item.get("entity_id")
                    if not entity_trigger2:
                        continue

                    _, device_class_trigger2 = self.process_trigger(entity_trigger2)

                    if not device_class_trigger2: # If no device_class, cannot match variable
                        continue
                    
                    if variable == device_class_trigger2:
                        solution_info = "" # Placeholder
                        rule_name2 = rule2.get("alias")
                        id_automation2 = rule2.get("id")
                        unique_id_chain = str(id_automation1) + "_" + str(id_automation2)
                        if not self.is_chain_present(rule_chain, unique_id_chain):
                            rule_chain.append({
                                "type": "indirect-chain",
                                "unique_id": unique_id_chain,
                                "chain_variable": variable, 
                                "rules": [
                                    {
                                        "id": id_automation1,
                                        "name": rule1_name,
                                        "description": rule1.get("description"),
                                    },
                                    {
                                        "id": id_automation2,
                                        "name": rule_name2,
                                        "description": rule2.get("description"),
                                    }
                                ],
                                "possibleSolutions": solution_info
                            })
                            return # Exit after finding the first indirect chain for this rule2


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
        
        print("Detected chains:", rule_chain_output)
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
