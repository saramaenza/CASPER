import sys # Added for testing
import os # Added for testing
# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import re
import db_functions as _db
import responses
import prompts
import models
from ha_client import HomeAssistantClient
import re
from langchain_core.messages import HumanMessage, SystemMessage

llm = models.gpt4

class ConflictDetector:
    def __init__(self, ha_client: HomeAssistantClient, user_id: str):
        self.ha_client = ha_client
        self.user_id = user_id
        self.conflicts_array = []
        self.condition_tag = ""
        self.trigger_tag = ""

    def clear_conflicts(self):
        """Clear the conflict array"""
        self.conflicts_array.clear()

    def call_find_solution_llm(self, id_automation1: str, id_automation2: str, rule_name1: str, rule_name2: str, automation1_description: str, automation2_description: str):
        """Generate solution for conflicts using LLM"""
        formatted_prompt = prompts.recommender.format(
            home_devices=_db.get_devices(self.user_id),
        )
        messages = [
            SystemMessage(formatted_prompt),
            HumanMessage(f"Generate a solution for the conflict between the following automations:\n{rule_name1}(id {id_automation1}): {automation1_description}\n{rule_name2}(id {id_automation2}):{automation2_description}"),
        ]
        structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
        data = structured_response.invoke(messages)
        return data

    def get_device_id(self, action):
        """Extract device_id from action"""
        target = action.get("target", {})
        device_id = action.get("device_id") or target.get("device_id") or action.get("entity_id") or target.get("entity_id")
        if device_id:
            device_id = re.sub(r'[\'\[\]]', '', str(device_id))
        return device_id

    def check_element_exists(self, name_rule1, name_rule2, trigger_type_rule1, trigger_type_rule2, action_type_rule1, action_type_rule2, device_name_rule1, device_name_rule2):
        """Check if a conflict element already exists"""
        for element in self.conflicts_array:
            if (element["rule1"]["name"] == name_rule1 and
                element["rule2"]["name"] == name_rule2 and
                element["rule1"]["trigger"][0]["type"] == trigger_type_rule1 and
                element["rule2"]["trigger"][0]["type"] == trigger_type_rule2 and
                element["rule1"]["action"][0]["type"] == action_type_rule1 and
                element["rule2"]["action"][0]["type"] == action_type_rule2 and
                element["rule1"]["action"][0]["device_friendly_name"] == device_name_rule1 and
                element["rule2"]["action"][0]["device_friendly_name"] == device_name_rule2):
                return True
        return False

    def is_conflict_present(self, conflict_array, id_conflict):
        """Check if id_conflict is already in the array"""
        for conflict in conflict_array:
            if conflict.get("unique_id") == id_conflict:
                return True
        return False   

    def append_conflict(self, rule_name1, rule_name2, automation1_description, automation2_description, type_of_conflict, id_automation1, id_automation2, id_device, state):  
        """Append a conflict to the array"""
        solution_info = self.call_find_solution_llm(id_automation1, id_automation2, rule_name1, rule_name2, automation1_description, automation2_description) 
        id_conflict = str(id_automation1)+"_"+str(id_automation2)+"_"+str(id_device)
        # Check if the conflict is already present before appending
        if not self.is_conflict_present(self.conflicts_array, id_conflict):
            self.conflicts_array.append({
                "type": "conflict",
                "tag": self.trigger_tag+'_'+self.condition_tag,
                "confidence": type_of_conflict,
                "unique_id": id_conflict,
                "rules": [
                    {
                        "id": id_automation1,
                        "name": rule_name1,
                        "description": automation1_description,
                    },
                    {
                        "id": id_automation2,
                        "name": rule_name2,
                        "description": automation2_description,
                    }
                ],
                "possibleSolutions": solution_info,
                "state": state
            })

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
            return None, None, False, None
        
        # Only handle atomic actions here - nested actions are handled in detect_conflicts
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
        return device_id, area_id, has_attrs, domain

    def get_devices_id(self, entities):
        """Get device IDs from entities list"""
        devices_id = []
        for e in entities:
            device_id = self.ha_client.get_device_id_from_entity_id(e)
            devices_id.append(device_id)
        return devices_id

    def get_info_zone(self, user, zone, event):
        """Get zone information"""
        user = self.ha_client.get_friendly_name(user)
        zone = self.ha_client.get_friendly_name(zone)
        return user + " " + event + " at " + zone

    def get_info_platform(self, platform, trigger):
        """Get platform information"""
        if platform == "time":
            return "time is " + trigger['at']
        if platform == "zone":
            info_zone = self.get_info_zone(trigger['entity_id'], trigger['zone'], trigger['event'])
            return info_zone
        if platform == "sun":
            return "there is the " + trigger['event']
        return platform

    def check_operators_appliances(self, type1, type2):
        """Check if two operators are conflicting"""
        if type1 == "turn_on":
            if type2 == "turn_off" or type2 == "brightness_decrease" or type2 == "brightness_increase" or type2 == "toggle":
                return True
            else: 
                return False
        elif type1 == "turn_off":
            if type2 == "turn_on" or type2 == "brightness_decrease" or type2 == "brightness_increase" or type2 == "toggle": 
                return True
            else:
                return False
        elif type1 == "brightness_increase":
            if type2 == "brightness_decrease" or type2 == "turn_on" or type2 == "turn_off" or type2 == "toggle":
                return True
            else: 
                return False
        elif type1 == "brightness_decrease":
            if type2 == "brightness_increase" or type2 == "turn_on" or type2 == "turn_off" or type2 == "toggle": 
                return True
            else:
                return False
        elif type1 == "toggle": 
            if type2 == "brightness_decrease" or type2 == "turn_off" or type2 == "brightness_increase" or type2 =="toggle" or type2 == "turn_on": 
                return True
            else:
                return False
        elif type1 == "open":
            if type2 == "close":
                return True
            else: 
                return False
        elif type1 == "close":
            if type2 == "open":
                return True
            else: 
                return False
        return False

    def get_event_type(self, e):
        """Extract event type from action/trigger"""
        event_type = e.get('type')
        service = e.get("service", None)
        if e.get("service") is not None:
            service = e.get("service") 
        if event_type is None and service is not None:
            event_type = re.sub(r'.*?\.', '', service) 
        if event_type is None:
            event_type = e.get('to')
        if event_type is None:
            action = e.get("action")
            if action is not None:
                event_type = re.sub(r'.*?\.', '', action) 
            if action is None:
                trigger = e.get("trigger")
                if trigger == "time":
                    event_type = e.get("at")
        return event_type

    def process_action_conflict(self, action1, action2, rule_name1, rule_name2, type_of_conflict, id_automation1, id_automation2, automation1_description, automation2_description, state):
        """Process and detect conflicts in actions using iterative approach"""
        # Handle nested actions using iterative approach to avoid recursion
        actions1_to_process = []
        actions2_to_process = []
        
        # Extract all atomic actions from action1
        if isinstance(action1, dict) and any(key in action1 for key in ["choose", "if", "repeat", "parallel"]):
            actions1_to_process = self.extract_all_actions([action1])
        else:
            actions1_to_process = [action1]
        
        # Extract all atomic actions from action2
        if isinstance(action2, dict) and any(key in action2 for key in ["choose", "if", "repeat", "parallel"]):
            actions2_to_process = self.extract_all_actions([action2])
        else:
            actions2_to_process = [action2]
        
        # Process all combinations of atomic actions
        for atomic_action1 in actions1_to_process:
            for atomic_action2 in actions2_to_process:
                self._process_atomic_action_conflict(atomic_action1, atomic_action2, rule_name1, rule_name2, type_of_conflict, id_automation1, id_automation2, automation1_description, automation2_description, state)

    def _process_atomic_action_conflict(self, action1, action2, rule_name1, rule_name2, type_of_conflict, id_automation1, id_automation2, automation1_description, automation2_description, state):
        """Process conflict between two atomic actions"""
        device_id1, area1, attr1, domain1 = self.process_action(action1)
        device_id2, area2, attr2, domain2 = self.process_action(action2)

        if (not device_id1 and not area1) or (not device_id2 and not area2):
            return

        if not device_id1 and area1:
            entities_by_domain_and_area1 = self.ha_client.get_entities_by_domain_and_area(area1, domain1)
            device_id1 = self.get_devices_id(entities_by_domain_and_area1)

        if not device_id2 and area2:
            entities_by_domain_and_area2 = self.ha_client.get_entities_by_domain_and_area(area2, domain2)
            device_id2 = self.get_devices_id(entities_by_domain_and_area2)

        # Handle device_id as list or string
        if isinstance(device_id1, list):
            array_device_action_id1 = device_id1
        elif isinstance(device_id1, str):
            array_device_action_id1 = device_id1.split(", ")
        else:
            array_device_action_id1 = []

        if isinstance(device_id2, list):
            array_device_action_id2 = device_id2
        elif isinstance(device_id2, str):
            array_device_action_id2 = device_id2.split(", ")
        else:
            array_device_action_id2 = []
        
        if type_of_conflict == "possible" and not array_device_action_id2:
            return

        common_device = [element for element in array_device_action_id1 if element in set(array_device_action_id2)]
        if not common_device:
            return

        for device in common_device:
            device_name_action1 = self.ha_client.get_device_name_by_user(device) or device
            device_name_action2 = device_name_action1

            if self.check_operators_appliances(self.get_event_type(action1), self.get_event_type(action2)) and not attr1 and not attr2:
                self.append_conflict(rule_name1, rule_name2, automation1_description, automation2_description, type_of_conflict, id_automation1, id_automation2, device, state)
            elif attr1 or attr2:
                data_attr = attr1 if attr1 else attr2
                for data in data_attr:
                    value_attribute1 = attr1.get(data, None) if attr1 else None
                    value_attribute2 = attr2.get(data, None) if attr2 else None
                    if value_attribute1 and value_attribute2 and value_attribute1 != value_attribute2:
                        self.append_conflict(rule_name1, rule_name2, automation1_description, automation2_description, type_of_conflict, id_automation1, id_automation2, device, state)
                    elif (value_attribute1 and not value_attribute2) or (not value_attribute1 and value_attribute2):
                        if not self.check_element_exists(rule_name1, rule_name2, None, None, self.get_event_type(action1), self.get_event_type(action2), device_name_action1, device_name_action2):
                            if self.check_operators_appliances(self.get_event_type(action1), self.get_event_type(action2)):
                                self.append_conflict(rule_name1, rule_name2, automation1_description, automation2_description, type_of_conflict, id_automation1, id_automation2, device, state)

    def array_conditions(self, condition1, condition2):
        """Process conditions arrays"""
        condition_info1 = []
        condition_info2 = []
        if condition1:
            for c in condition1:
                if "conditions" in c:
                    for condition in c["conditions"]:
                        condition = self.get_condition_info(condition, c["condition"])
                        condition_info1.append(condition)
                elif "condition" in c:
                    condition = self.get_condition_info(c, c["condition"])
                    condition_info1.append(condition)
        if condition2:
            for c in condition2:
                if "conditions" in c:
                    for condition in c["conditions"]:
                        condition = self.get_condition_info(condition, c["condition"])
                        condition_info2.append(condition)
                elif "condition" in c:
                    condition = self.get_condition_info(c, c["condition"])
                    condition_info2.append(condition)
        return condition_info1, condition_info2

    def check_condition(self, condition1, condition2):
        """Check if conditions are conflicting"""
        if not condition1 and not condition2:
            self.condition_tag = "no_conditions"
            return True
        if not condition1 or not condition2:
            self.condition_tag = "different_conditions"
            return True
        if condition1 == condition2:
            self.condition_tag = "same_conditions"
            return True
        for c1 in condition1:
            for c2 in condition2:
                if c1['condition'] != "or" and c2['condition'] != "or":
                    if c1.get('device') is not None and c2.get('device') is not None and c1.get('type') is not None and c2.get('type') is not None:
                        if c1.get('device') == c2.get('device') and c1.get('type') != c2.get('type'):
                            return False
                        if (c1.get('device') == c2.get('device') and c1.get('type') == c2.get('type')) and (c1['condition'] == 'not' or c2['condition'] == 'not'):
                            return False
                    if c1.get('user') is not None and c2.get('user') is not None and c1.get('zone') is not None and c2.get('zone') is not None:
                        if c1.get('user') == c2.get('user') and c1.get('zone') != c2.get('zone'):
                            return False
                        if (c1.get('user') == c2.get('user') and c1.get('zone') != c2.get('zone')) and (c1['condition'] == 'not' or c2['condition'] == 'not'):
                            return False
        self.condition_tag = "different_conditions"
        return True

    def get_condition_info(self, condition, type_condition):
        """Extract condition information"""
        if "condition" in condition:
            if "state" in condition["condition"]:
                entity_id = condition.get('entity_id')
                if entity_id:
                    device_name = self.ha_client.get_device_name_by_user(entity_id)
                    if device_name is None or device_name == "None":
                        device_name = self.ha_client.get_friendly_name(entity_id)
                        if device_name is None or device_name == "None":
                            device_name = entity_id
                else:
                    device_name = None
                state_value = condition.get('state')
                condition = {
                    "condition": type_condition,
                    "device": device_name if device_name is not None else entity_id,
                    "type": state_value,
                }
            if "device" in condition["condition"]:
                device = condition['device_id']
                device = self.ha_client.get_device_name_by_user(device)
                type_device = condition['type']
                condition = {
                    "condition": type_condition,
                    "device": device,
                    "type": type_device,
                }
            if "zone" in condition["condition"]:
                user = self.ha_client.get_friendly_name(condition['entity_id'])
                zone = self.ha_client.get_friendly_name(condition['zone'])
                condition = {
                    "condition": type_condition,
                    "user": user,
                    "zone": zone
                }
            if "time" in condition["condition"]:
                after = None
                before = None
                if 'after' in condition:
                    after = condition['after']
                if 'before' in condition:
                    before = condition['before']
                weekday = None
                if "weekday" in condition:
                    weekday = condition['weekday']
                condition = {
                    "condition": type_condition,
                    "after": after,
                    "before": before,
                    "weekday": weekday
                }
        return condition

    def process_conditions(self, condition1, condition2):
        """Process conditions and return processed arrays"""
        if condition1:
            if condition1[0]['condition'] == "or" and len(condition1[0]['conditions']) == 1:
                condition1[0]['condition'] = "and"
        if condition2:
            if condition2[0]['condition'] == "or" and len(condition2[0]['conditions']) == 1:
                condition2[0]['condition'] = "and"
        return self.array_conditions(condition1, condition2)
    
    def check_opposite_triggers(self, trigger1, trigger2):
        # Estrai l'entità dai triggers
        trigger_entity_id_1 = trigger1.get('entity_id')
        trigger_entity_id_2 = trigger2.get('entity_id')
        device_trigger_1 = None
        device_trigger_2 = None

        if not device_trigger_1 and 'device_id' in trigger1:
            device_trigger_1 = trigger1.get("device_id")

        if not device_trigger_2 and 'device_id' in trigger2:
            device_trigger_2 = trigger2.get("device_id")

        if not device_trigger_1 and trigger_entity_id_1:
            device_trigger_1 = trigger_entity_id_1

        if not device_trigger_2 and trigger_entity_id_2:
            device_trigger_2 = trigger_entity_id_2

        if device_trigger_1 != device_trigger_2:
            return False
        else:
            type_trigger_1 = self.get_event_type(trigger1)
            type_trigger_2 = self.get_event_type(trigger2)
            if type_trigger_1 == type_trigger_2:
                return False
        return True 

    def detect_conflicts(self, rules, rule1):
        """Main function to detect conflicts"""
        self.clear_conflicts()

        # Helper function to process a single rule pair
        def process_rule_pair(rule1, rule2, state=None):
            rule_name1 = rule1.get("alias", "")
            rule_name2 = rule2.get("alias", "")
            entity_rule_name1 = f"automation.{rule_name1.replace(' ', '_')}"
            entity_rule_name2 = f"automation.{rule_name2.replace(' ', '_')}"

            if entity_rule_name1 == entity_rule_name2:
                return  # Skip if the rules are the same

            rule1_trigger = rule1.get("trigger") or rule1.get("triggers")
            rule2_trigger = rule2.get("trigger") or rule2.get("triggers")
            rule1_condition = rule1.get("condition") or rule1.get("conditions")
            rule2_condition = rule2.get("condition") or rule2.get("conditions")
            actions1 = rule1.get("actions", []) or rule1.get("action", [])
            actions2 = rule2.get("actions", []) or rule2.get("action", [])

            id_automation1 = rule1.get("id")
            id_automation2 = rule2.get("id")
            
            # Controllo per trigger opposti
            for t1 in rule1_trigger:
                #print("Checking trigger from rule 1:", t1)
                for t2 in rule2_trigger:
                    #print("Against trigger from rule 2:", t2)
                    if self.check_opposite_triggers(t1, t2):
                        return

            automation1_description = rule1.get("description", "")
            automation2_description = rule2.get("description", "")

             # Extract all nested actions
            all_actions1 = self.extract_all_actions(actions1)
            all_actions2 = self.extract_all_actions(actions2)

            # Check triggers and conditions
            same_trigger = rule1_trigger == rule2_trigger
            self.trigger_tag = "same_event" if same_trigger else "different_event"
            rule1_condition, rule2_condition = self.process_conditions(rule1_condition, rule2_condition)
            conditions_compatible = self.check_condition(rule1_condition, rule2_condition)

            if not conditions_compatible:
                return  # Skip if conditions are not compatible

            type_of_conflict = "certain" if same_trigger else "possible"

            # Process actions for conflicts using the corrected method
            for action1 in all_actions1:
                for action2 in all_actions2:
                    self.process_action_conflict(
                        action1, action2, rule_name1, rule_name2, type_of_conflict,
                        id_automation1, id_automation2, automation1_description,
                        automation2_description, state
                    )

        # Process all rules or a single rule
        if rule1 != "all_rules":
            for rule2 in rules:
                process_rule_pair(rule1, rule2['config'], state=rule2.get("state"))
        else:
            for i, rule1 in enumerate(rules):
                for j in range(i + 1, len(rules)):
                    process_rule_pair(rule1['config'], rules[j]['config'], state=rules[j].get("state"))

        return self.conflicts_array
    
# Usage example and backward compatibility
"""def detectConflicts(rules, rule1, ha_client: HomeAssistantClient, user_id: str):
    detector = ConflictDetector(ha_client, user_id)
    return detector.detect_conflicts(rules, rule1)
    """


if __name__ == "__main__":
    # url HA ufficio
    base_url = "http://192.168.0.10:8123"
    
    # url HA casa simone
    # base_url = "https://test-home.duckdns.org"
    user_id = "681dc95bd86883dcc0eeebad"
    
    # token HA ufficio
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI5OTExYzg0ZDkzYmE0MGM1Yjk3NzMzNGMzYTU4NzNkYSIsImlhdCI6MTc1OTkxMzgyMywiZXhwIjoyMDc1MjczODIzfQ.MxA-KCc-4qC4dzg4V9ngtPb9Pq35FG2G5xkvfOz6f3M"
    
    # Create HomeAssistant client
    ha_client = HomeAssistantClient(base_url, token)
    
    # Create ConflictDetector
    detector = ConflictDetector(ha_client, user_id)
    
    #all_rules = _db.get_automations(user_id)

    all_rules = [
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
    
    automations_post = {
        "alias": "Spegni il purificatore alle 11:00",
        "description": "Evento: alle 11:00 (fan.xiaomi_cpa4_a885_air_purifier_2) Azione: spegni il purificatore (fan.xiaomi_cpa4_a885_air_purifier_2)",
        "triggers": [
            {
            "at": "11:00:00",
            "trigger": "time"
            }
        ],
        "actions": [
            {
            "target": {
                "entity_id": "fan.xiaomi_cpa4_a885_air_purifier_2"
            },
            "action": "fan.turn_off",
            "data": {}
            }
        ]
    }

    # Call the function
    conflicts_array = detector.detect_conflicts(all_rules, automations_post)

    print("Info Conflict Array LLM: ", conflicts_array)