#### For real use ####
#from problems.list_devices_variables import list_devices
#from problems.list_variables_goals import list_variables_goals
from http import client
from marshmallow import pprint
from requests import get, post


import sys # Added for testing
import os # Added for testing
import re  
from collections import OrderedDict
import db_functions as _db

from problems.fuzzy_wellbeing import getWellBeingFuzzy
from problems.fuzzy_health import getHealthFuzzy
from problems.fuzzy_energy_saving import getEnergySavingFuzzy
from problems.fuzzy_security import getSecurityFuzzy
from problems.fuzzy_safety import getSafetyFuzzy
from problems.fuzzy_utils import getData
import models
import prompts
from langchain_core.messages import HumanMessage, SystemMessage
llm = models.gpt4
import responses
#### For testing purposes ####
from problems.list_devices_variables import list_devices # Changed for testing
from problems.list_variables_goals import list_variables_goals # Changed for testing

# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def getContextVariables(list_devices_variables, action_domain, eventType):
    domain_data = list_devices_variables["list_of_domains"].get(action_domain)
    if domain_data is not None and "possibleValues" in domain_data:
        for item in domain_data["possibleValues"]:
            if item["value"] == eventType:
                    decrease = item.get("decrease_variable", [])
                    increase = item.get("increase_variable", [])
                    return OrderedDict([
                        ("decrease", decrease),
                        ("increase", increase)
                    ])
    # WTF 
    if action_domain != "switch": 
        return OrderedDict([
        ("decrease", []),
        ("increase", ["sound_pressure"])
        ])
    return OrderedDict([
        ("decrease", []),
        ("increase", [])
    ])


def get_device_id(action):
    target = action.get("target", {})
    device_id = action.get("device_id") or target.get("device_id") or action.get("entity_id") or target.get("entity_id")
    if device_id:
        device_id = re.sub(r'[\'\[\]]', '', str(device_id))
    return device_id

def getTextType(eventType):
    if eventType == "turn_on":
        return "turning on"
    if eventType == "turn_off":
        return "turning off"
    return eventType 


#def getNegative(list_variables_goals, var_effect, variable, userGoal, area, nameDevice, environment, environmentVariables, entity_id):
def getNegative(list_variables_goals, var_effect, variable, userGoal, area, nameDevice, environment, environmentVariables, description, user_id):
    if variable not in list_variables_goals["list_of_vars"]:
        return "None"
    
    negative_effects = list_variables_goals["list_of_vars"][variable]["negative_effect_on_goal"]
        
    result_effects = []
    
    # Usa find_one per recuperare da una collezione MongoDB
    #automation_desc = rules.find_one({"entity_id": entity_id})
    
    automation_description = description
 
    #automation_description = "This automations activates the fan when the temperature is over 25 degrees Celsius in the office." if automation_description == "" else automation_description

    goal_to_fuzzy_function = {
        "well-being": getWellBeingFuzzy,
        "health": getHealthFuzzy,
        "security": getSecurityFuzzy,
        "safety": getSafetyFuzzy,
        "energy": lambda fuzzy_rules, area, environment, environmentVariables: getEnergySavingFuzzy(fuzzy_rules, area, environment, nameDevice, environmentVariables)
    }

    for effect in negative_effects:


        if effect["goal"] != userGoal:
            continue

        # Iterate over all "when" conditions for this effect
        for when_condition in effect["when"]:
        
            if when_condition["variable_effect"] not in [var_effect, "none"]:
                continue
 
            fuzzy_rules = when_condition['fuzzyRulesToCheck']

            description = effect["description"]

            if fuzzy_rules != "none":
                fuzzy_function = goal_to_fuzzy_function.get(userGoal)
                if not fuzzy_function:
                    continue

                args = [fuzzy_rules, area, environment, environmentVariables]

                problem_result = fuzzy_function(*args)

                if problem_result:
                    
                    problem_level, data_env = problem_result
                    
                    if(len(problem_level) > 0):
                        
                        fuzzy_rule_activated = problem_level[2]
                        solution_info = call_find_solution_llm(userGoal, fuzzy_rule_activated, automation_description, user_id)
                        if(solution_info is not None):
                            solution = solution_info
                        else:
                            solution = ""
                    else:
                        fuzzy_rule_activated = ""
                        solution = ""
                    
                    if problem_level:
                        result_effects.append((description, str(problem_level), variable, data_env, solution))
            # If the condition is not fuzzy, check the desired value
            
            elif when_condition['desidered_value'] == True:
                value_env = getData(environment, variable, area, environmentVariables)
                # TODO vedere come prendere questi dati
                '''
                
                value_desired = collection_desidered_value.find_one({'room_name': area.lower()})
                
                if value_desired and value_env is not None:
                    value_desired = value_desired.get(variable)
                    if value_desired is not None:
                        condition = (
                            ("lower" in description and value_env < value_desired) or
                            ("higher" in description and value_env > value_desired)
                        )
                        
                        if condition:
                            unit = "°" if variable == "temperature" else "%"
                            updated_desc = f"{description} ({value_desired}{unit}) in {area}"
                            updated_desc = updated_desc.replace("...", f"{value_env}{unit}")
                            effects.append((updated_desc, None, variable, None))
                    '''


    return result_effects
            

#Support function used by the fuzzy modules
def get_real_environment_variables(entities):
    environmentVariables = {}

    def process_entity(entity, class_type=None):
        
        return {
            "entity_id": entity["e"],
            "name": entity['f'],
            "state": None,
            "room": entity['a'],
            "class": entity['dc'],
            "unit_of_measurement": entity['unit'],
            "options": entity['options']
        }

    for entity in entities:
        environmentVariables[entity['e']] = process_entity(entity)

    return environmentVariables


def call_find_solution_llm(user_goal: str, fuzzy_rule_activated: str, automation_description: str, user_id: str):
    """Generate solution for conflicts using LLM"""
    formatted_prompt = prompts.recommender.format(
        home_devices=_db.get_devices(user_id),
    )
    messages = [
        SystemMessage(formatted_prompt),
        HumanMessage(f"Generate a solution for the issue between the user goal: {user_goal} and the following automation: {automation_description} because it activates the fuzzy rule: {fuzzy_rule_activated}. Provide a solution that is clear and actionable, considering the user's goal and the automation's function."),
    ]
    structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
    data = structured_response.invoke(messages)
    return data

#def detectGoalAdvisor(states, userGoal, environment, infoCtx, selectedAutomation):
def detectGoalAdvisor(automation, goal, user_id, ha_client_instance):

    goalAdvisor_array = []
    config_data = _db.get_config(user_id)

    environmentVariables = get_real_environment_variables(config_data)  
      
    ruleName = automation.get("alias", None)   
    description = automation.get("description", None)
    id_automation = automation.get("id", None)
    actions = automation.get("actions", [])  #recupero le azioni delle automazioni
    if not actions:
        actions = automation.get("action", [])

    for index, action in enumerate(actions):
        domain = action.get("domain")
        entity_id = action.get("entity_id", None)
        if entity_id is None:
            entity_id = action.get("target", {}).get("entity_id", None)

        service = action.get("service")

        domain = service.split('.')[0] if service else action.get("domain")

        device_id = get_device_id(action)
        
        if not device_id:
            continue
        nameDevice = ha_client_instance.get_device_name_by_user(device_id)
        if(nameDevice == None or nameDevice == "None"):
            nameDevice = device_id

        area_id = action.get("target", {}).get("area_id")

        if (area_id == None):
            area_id = ha_client_instance.getRoomDevice(device_id)  
            #get the device name given by the user
        
        eventType = action.get("type", None)
        if eventType is None:
            eventType = service.split('.')[1] 
        #type = getTextType(eventType)
        
        if not device_id and not area_id:
            continue
        area = area_id

        #recupero le variabili di contesto influenzate dalle azioni
        contextVar = getContextVariables(list_devices, domain, eventType)
        for key, values in contextVar.items():

            effect = key
            variables = values
            for variable in variables:
                negativeEffect = getNegative(list_variables_goals, effect, variable, goal, area, nameDevice, "real", environmentVariables, description, user_id)

                if negativeEffect != None and len(negativeEffect) > 0: 

                    unique_id_chain = f"{id_automation}_{device_id}_{area}_{variable}_{effect}"

                    goalAdvisor_array.append({
                        "type": "goal_advisor",
                        "unique_id": unique_id_chain,
                        "negative_effects": negativeEffect,
                        "goal": goal,
                        "state": "on",
                        "rules": [{
                            "id": id_automation,
                            "name": ruleName,
                            "description": description,
                        }]
                    })

                    # Inserimento del documento nella collezione
                    #collection_goal_advisor_log.insert_one(documento)
                    #print("Document inserted into goal_advisor_log collection:")
                    #print(documento)

    return goalAdvisor_array


'''

client = ha_client.HomeAssistantClient(base_url=HA_BASE_URL, token=HA_TOKEN)
states = client.get_all_states()  # Get all states (already a Python list/dict)
# --- End Testing Setup ---

detectGoalAdvisor(states)
'''