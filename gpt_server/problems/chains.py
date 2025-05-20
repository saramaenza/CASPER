import json
import requests
from requests import get, post
import re
import ast
from .. import db_functions as _db
from typing import List, Dict, Any, Tuple
from collections import OrderedDict

class HomeAssistantClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            "Authorization": "Bearer " + token,
            "content-type": "application/json",
        }

    def _check_response(self, response: requests.Response) -> str:
        if response.status_code == 200:
            return response.text
        else:
            response.raise_for_status()

    def _make_get_request(self, url_path: str) -> str:
        response = get(self.base_url + url_path, headers=self.headers)
        return self._check_response(response)

    def _make_post_request(self, url_path: str, data: Dict[str, Any]) -> str:
        response = post(self.base_url + url_path, headers=self.headers, data=json.dumps(data))
        return self._check_response(response)

    def get_all_states(self) -> str: # Returns raw JSON string
        return self._make_get_request("/api/states")

    def render_template(self, template: str) -> str:
        data = {"template": template}
        return self._make_post_request("/api/template", data)

    def get_device_id_from_entity_id(self, entity_id: str) -> str:
        template = '{{ device_id("' + entity_id + '") }}'
        return self.render_template(template)

    def get_device_class_by_entity_id(self, entity_id: str) -> str:
        # This template relies on the 'states' object being available in the HA template environment
        template = '{% for sensor in states %}{% if sensor.entity_id == "' + entity_id + '" %}{{ sensor.attributes.device_class }}{% endif %}{% endfor %}'
        return self.render_template(template)

    def get_entities_by_area(self, area: str) -> str: # Returns raw JSON string list of entities
        template = '{{ area_entities("' + area + '") }}'
        return self.render_template(template)

    def get_entities_by_domain_and_area(self, area: str, domain: str) -> List[str]:
        # Assuming area is a single string. If it can be a list, this needs adjustment.
        # area_str = ' '.join(area) if isinstance(area, list) else area # Original had ' '.join(area)
        entities_by_area_str = self.get_entities_by_area(area)
        try:
            entities_by_area = ast.literal_eval(entities_by_area_str)
            if not isinstance(entities_by_area, list):
                # Log or handle cases where template doesn't return a list string
                return []
        except (ValueError, SyntaxError):
            # Log or handle cases where ast.literal_eval fails
            return []
        return [item for item in entities_by_area if isinstance(item, str) and item.startswith(domain)]


class ChainsDetector:
    def __init__(self, ha_client: HomeAssistantClient, list_devices_variables_path: str, db_module: Any):
        self.ha_client = ha_client
        self.db = db_module
        self.list_devices_variables = self._load_devices_variables(list_devices_variables_path)
        # self.all_ha_states = self._initialize_states() # Removed global states, fetch when needed or pass if required by many methods

    # def _initialize_states(self) -> List[Dict[str, Any]]: # Changed from global
    #     states_str = self.ha_client.get_all_states()
    #     try:
    #         return json.loads(states_str)
    #     except json.JSONDecodeError:
    #         # Log error or raise
    #         return []

    def _load_devices_variables(self, path: str) -> Dict[str, Any]:
        # GIOVE
        # with open('C:\\LaboratorySite\\www\\demo\\explaintap\\main\\list_devices_variables.json', 'r') as file:
        with open(path, 'r') as file:
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
            type_event = re.sub(r'.*?\.', '', service)
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
        return re.sub(r'[\'\[\]]', '', str(device_id)) if device_id else None

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
                             automation1_description: str, rule1_name: str, id_automation1: str,
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
            trigger_entity_id = trigger2_item.get('entity_id')
            device_trigger2 = None
            if trigger_entity_id:
                # We need to compare device_action1 (can be a device_id) with something from trigger2.
                # If device_action1 is an entity_id, we compare directly.
                # If device_action1 is a device_id, we need device_id of trigger_entity_id.
                # For now, let's assume device_action1 is comparable to trigger_entity_id or its device_id.
                # This part might need refinement based on what device_action1 actually holds.
                # The original compared device_action1 (from getID) with trigger2[0]['entity_id'] or trigger2[0]['device_id']
                # Let's assume for now device_action1 is an entity_id for direct comparison,
                # or that it's a device_id and trigger2_item also has a device_id.
                
                # Simplified: if action targets an entity_id, and trigger is for that entity_id
                if isinstance(device_action1, str) and device_action1 == trigger_entity_id:
                     device_trigger2 = trigger_entity_id # or self.ha_client.get_device_id_from_entity_id(trigger_entity_id)
                elif 'device_id' in trigger2_item:
                     device_trigger2 = trigger2_item['device_id']
                # If device_action1 is a list (from area), this comparison is more complex.
                # Original code: device_trigger2 = trigger2[0].get("device_id") or trigger2[0]['entity_id']

            if not device_trigger2 and 'device_id' in trigger2_item: # Fallback to device_id if entity_id not matched
                 device_trigger2 = trigger2_item.get("device_id")
            
            if not device_trigger2 and trigger_entity_id: # If action was by entity, trigger might be by entity
                device_trigger2 = trigger_entity_id


            type_trigger2 = self.get_event_type(trigger2_item)

            # Comparison logic:
            # device_action1 can be a single ID (str) or a list of IDs (if from area).
            # device_trigger2 is likely a single ID (str).
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
                id_chain = str(id_automation1) + "_" + str(id_automation2)

                if not self.is_chain_present(rule_chain, id_chain):
                    rule_chain.append({
                        "id_chain": id_chain,
                        "rule_id": id_automation1,
                        "rule_name": rule1_name,
                        "possible_triggered_rule_id": id_automation2,
                        "triggered_rule_name": rule_name2,
                        "possibleSolutions": solution_info,
                        "type_of_chain": "direct"
                    })
                    # If a match is found with one trigger, we can break or continue if multiple triggers can match
                    break # Assuming one match per rule2 is sufficient for "direct chain"

    def process_indirect_chain(self, rule_chain: List[Dict[str, Any]], rule1: Dict[str, Any], rule2: Dict[str, Any],
                               action1_details: Dict[str, Any],
                               automation1_description: str, rule1_name: str, id_automation1: str,
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

                    # process_trigger expects entity_id string or list of strings
                    # entity_trigger2 is likely a single string here
                    _, device_class_trigger2 = self.process_trigger(entity_trigger2)

                    if not device_class_trigger2: # If no device_class, cannot match variable
                        continue
                    
                    # The variable is something like "temperature", "humidity" (a device_class)
                    if variable == device_class_trigger2:
                        solution_info = "" # Placeholder
                        rule_name2 = rule2.get("alias")
                        id_automation2 = rule2.get("id")
                        id_chain = str(id_automation1) + "_" + str(id_automation2)

                        if not self.is_chain_present(rule_chain, id_chain):
                            rule_chain.append({
                                "id_chain": id_chain,
                                "rule_id": id_automation1,
                                "rule_name": rule1_name,
                                "possible_triggered_rule_id": id_automation2,
                                "triggered_rule_name": rule_name2,
                                "possibleSolutions": solution_info,
                                "variable": variable,
                                "type_of_chain": "indirect"
                            })
                            # Found a chain, can break from inner loops if one match is enough
                            # Or continue to find all possible indirect links via different variables/triggers
                            # For now, let's assume one match is enough for this rule2
                            return # Exit after finding the first indirect chain for this rule2


    def _process_rule_chain_iteration(self, all_existing_rules: List[Dict[str, Any]],
                                   rule1_config: Dict[str, Any], automation1_description: str,
                                   chain_processing_function: callable) -> List[Dict[str, Any]]:
        rule_chain_output = []
        
        # rule1_config is the automation_post from the original call
        rule1_alias = rule1_config.get("alias")
        if not rule1_alias:
            print("Rule 1 has no alias, skipping.")
            return [] # Or handle error appropriately

        entity_rule_name1 = "automation." + rule1_alias.replace(" ", "_")
        #print(f"Entity Rule Name 1: {entity_rule_name1}")
        rule_name1 = rule1_alias
        #print(f"Rule Name 1: {rule_name1}")
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

            for rule2_wrapper in all_existing_rules: # rule2_wrapper is like {"config": {...}, "user_id": ...}
                rule2_config = rule2_wrapper.get("config")
                if not rule2_config or not isinstance(rule2_config, dict):
                    continue

                rule2_alias = rule2_config.get("alias")
                if not rule2_alias: continue # Skip rule2 if no alias

                rule2_entity_id = "automation." + rule2_alias.replace(" ", "_")
                
                if entity_rule_name1 == rule2_entity_id: # Don't compare a rule to itself
                    continue
                
                # print(f"Comparing with Rule 2: {rule2_alias} (Entity ID: {rule2_entity_id})")
                chain_processing_function(
                    rule_chain_output, rule1_config, rule2_config, action1_details,
                    automation1_description, rule_name1, id_automation1, rule2_entity_id
                )
        
        print("Detected chains:", rule_chain_output)
        return rule_chain_output

    def detect_chains(self, user_id_for_db: str, automation_post_config: Dict[str, Any],
                      automation_post_description: str, chain_type: str = "indirect") \
                      -> List[Dict[str, Any]]:
        
        all_rules_from_db = self.db.get_automations(user_id_for_db) # Assumes _db.get_automations structure
        
        # The 'entities' argument from original detect_direct_rule_chain_LLM is not used here.
        # If it was meant to be all_ha_states, it should be fetched if needed by chain_processing_function.
        # For now, neither direct nor indirect chain processing functions use it directly.

        processing_function = self.process_indirect_chain
        if chain_type == "direct":
            processing_function = self.process_direct_chain
        elif chain_type != "indirect":
            raise ValueError(f"Unknown chain_type: {chain_type}. Must be 'direct' or 'indirect'.")

        return self._process_rule_chain_iteration(
            all_existing_rules=all_rules_from_db,
            rule1_config=automation_post_config,
            automation1_description=automation_post_description,
            chain_processing_function=processing_function
        )

# Example usage (to be adapted or moved to a test/main script)
if __name__ == "__main__":
    # Configuration - should come from a config file or environment variables
    HA_BASE_URL = "http://luna.isti.cnr.it:8123" # Example
    HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk" # Example
    LIST_DEVICES_PATH = 'C:/Users/andre/Programmazione/CASPER ENV/CASPER/gpt_server/problems/list_devices_variables.json' # Example
    DB_USER_ID = "682c59206a47b8e0ef343796" # Example

    # Instantiate the client and detector
    ha_client = HomeAssistantClient(base_url=HA_BASE_URL, token=HA_TOKEN)
    # The _db module needs to be accessible here. For a standalone script, you might need to mock it
    # or ensure the script is run in an environment where `from .. import db_functions as _db` works.
    # For this example, I'll assume _db is available.
    try:
        from .. import db_functionssss as _db_module
    except ImportError:
        # Mock _db if running standalone and .. import fails
        class MockDb:
            def get_automations(self, user_id):
                print(f"MockDb: Called get_automations for user {user_id}")
                # Return example data similar to what _db.get_automations would return
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
                              db_module=_db_module)

    # Example automation_post (the new/modified automation)
    current_automation_config = {
        "alias": "Accendi la lampadina Sara quando piove fuori casa",
        "description": "Evento: quando fuori casa piove (weather.forecast_casa). Azione: accendi Lampadina_Sara (light.lampadina_sara1).",
        "trigger": [ # Changed from "trigger" to "triggers" for consistency, assuming actions/triggers are lists
          {
            "platform": "state",
            "entity_id": "weather.forecast_casa",
            "to": "rainy"
          }
        ],
        "condition": [],
        "actions": [ # Changed from "action" to "actions"
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
        user_id_for_db=DB_USER_ID,
        automation_post_config=current_automation_config,
        automation_post_description=current_automation_description,
        chain_type="direct"
    )
    # print("Found direct chains:", json.dumps(direct_chains, indent=2))

    print("\\n--- Detecting Indirect Chains ---")
    # The original call in the script was detect_direct_rule_chain_LLM but it called process_indirect_chain.
    # Now we explicitly call with chain_type="indirect"
    indirect_chains = detector.detect_chains(
        user_id_for_db=DB_USER_ID,
        automation_post_config=current_automation_config,
        automation_post_description=current_automation_description,
        chain_type="indirect"
    )
    # print("Found indirect chains:", json.dumps(indirect_chains, indent=2))

    # Example of using find_automation_entity_id (if you have all_states data)
    # all_states = json.loads(ha_client.get_all_states()) # Fetch all states
    # entity_id = ChainsDetector.find_automation_entity_id(all_states, "some_automation_id_from_attributes")
    # print(f"Found entity_id for automation 'some_automation_id_from_attributes': {entity_id}")
