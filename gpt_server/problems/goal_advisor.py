#### For real use ####
#from problems.list_devices_variables import list_devices
#from problems.list_variables_goals import list_variables_goals
from requests import get, post


import sys # Added for testing
import os # Added for testing
import re
import datetime
from datetime import datetime   
from collections import OrderedDict


from fuzzy_wellbeing import getWellBeingFuzzy
from fuzzy_health import getHealthFuzzy
from fuzzy_energy_saving import getEnergySavingFuzzy
from fuzzy_security import getSecurityFuzzy
from fuzzy_safety import getSafetyFuzzy

from fuzzy_utils import getData

# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# User ID for testing purposes
user_id = "681e05bfd5c21048c157e431"

import models
import prompts
from langchain_core.messages import HumanMessage, SystemMessage
llm = models.gpt4
import responses


import db_functions as _db


# --- Testing Setup ---
# IMPORTANT: Replace with your actual Home Assistant URL and Long-Lived Access Token

HA_BASE_URL = "http://luna.isti.cnr.it:8123" # Example
HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk" # Example

userGoal = "health" # Example user goal

headers = {
    "Authorization": "Bearer " + HA_TOKEN,
    "content-type": "application/json",
}

#all_rules = _db.get_automations("681b32b0f15a9285411c12b1")
#print("all_rules")
#print(all_rules)
rules = []

#### For testing purposes ####
from list_devices_variables import list_devices # Changed for testing
from list_variables_goals import list_variables_goals # Changed for testing

import json

import ha_client # Changed for testing

''' Muovere tutto in fuzzy_utils ?'''
#Search for the entity ID of the automation based on the ID of the automation's 'attributes' element
def findAutomationEntityId(data, id):
    for item in data:
        if 'attributes' in item and item['attributes'].get('id') == id:
            entity_id_automation = item['entity_id']
    return entity_id_automation



#Sends an HTTP GET request to the specified URL and retrieves the response text
def getDataResponse(url):
    response = get(url, headers=headers)
    return response.text


#It returns a JSON with all the automations, including all information, such as triggers and actions
def getAutomationsInfo(realData):
    automationAttributeID = []
    #realData = json.loads(realData)
    #keep only the 'attributes' IDs of each automation
    automationAttributeID = [item["attributes"]["id"] for item in realData if item["entity_id"].startswith("automation.")]
    for id in automationAttributeID:
        entityAutomationID = findAutomationEntityId(realData, id)
        url = HA_BASE_URL + "/api/config/automation/config/"+id
        data = json.loads(getDataResponse(url))
        data["entity_id"] = entityAutomationID
        rules.append(data)
    return rules



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


#get the device name given by the user
def getNameUserDevice(device):
    template =  '{{ device_attr("'+device+'", "name_by_user") }}'
    return client.render_template(template)


def getEventType(e):
    service = None
    type = e.get('type')
    if(e.get("service") != None):
        service = e.get("service") 
    if(type == None and service != None):
        type = re.sub(r'.*?\.', '', service) 
    if(type == None):
        action = e.get("action") 
        type = re.sub(r'.*?\.', '', action) 
    return type


def getTextType(eventType):
    if eventType == "turn_on":
        return "turning on"
    if eventType == "turn_off":
        return "turning off"
    return eventType 


#def getNegative(list_variables_goals, var_effect, variable, userGoal, area, nameDevice, environment, environmentVariables, entity_id):
def getNegative(list_variables_goals, var_effect, variable, userGoal, area, nameDevice, environment, environmentVariables, entity_id):
    if variable not in list_variables_goals["list_of_vars"]:
        return "None"
    
    negative_effects = list_variables_goals["list_of_vars"][variable]["negative_effect_on_goal"]
        
    result_effects = []
    
    # Usa find_one per recuperare da una collezione MongoDB
    #automation_desc = rules.find_one({"entity_id": entity_id})
    
    automation_description = ""
    for rule in rules:
        if rule.get("entity_id") == entity_id:
            #print("Found rule for entity_id:", entity_id)
            automation_description = rule.get("description", "")
            break

    #automation_description = automation_desc["description"] if automation_desc else ""
 
    automation_description = "This automations activates the fan when the temperature is over 25 degrees Celsius in the office." if automation_description == "" else automation_description

    goal_to_fuzzy_function = {
        "well-being": getWellBeingFuzzy,
        "health": getHealthFuzzy,
        "security": getSecurityFuzzy,
        "safety": getSafetyFuzzy,
        "energy saving": lambda fuzzy_rules, area, environment, environmentVariables: getEnergySavingFuzzy(fuzzy_rules, area, environment, nameDevice, environmentVariables)
    }



    for effect in negative_effects:
        '''
        print("EFFECT")
        print(effect)
        print("userGoal")
        print(userGoal)
        print("---------------------------------------------")
        '''
        if effect["goal"] != userGoal:
            continue
        

        # Iterate over all "when" conditions for this effect
        for when_condition in effect["when"]:
        
            if when_condition["variable_effect"] not in [var_effect, "none"]:
                print(f"Skipping rule because variable_effect '{when_condition['variable_effect']}' not in ['{var_effect}', 'none']")
                continue
 
            fuzzy_rules = when_condition['fuzzyRulesToCheck']

            description = effect["description"]

            if fuzzy_rules != "none":
                fuzzy_function = goal_to_fuzzy_function.get(userGoal)
                if not fuzzy_function:
                    continue

                args = [fuzzy_rules, area, environment, environmentVariables]
                #print("BEFORE PROBLEM RESULT (FUZZY FUNCTION CALL)")
                problem_result = fuzzy_function(*args)
                #print("-----------------------------------")
                #print(f"AFTER FUZZY CALL: problem_result: {problem_result}")
            
            
                if problem_result:
                    
                    problem_level, data_env = problem_result
                    #print("problem_level")
                    #print(problem_level)
                    
                    if(len(problem_level) > 0):
                        
                        fuzzy_rule_activated = problem_level[2]
                        solution_info = call_find_solution_llm(userGoal, fuzzy_rule_activated, automation_description)
                        if(solution_info is not None):
                            solution = solution_info
                            #solution = solution_info.get("solution")
                        else:
                            solution = ""
                    else:
                        fuzzy_rule_activated = ""
                        solution = ""
                    
                    if problem_level:
                        print("APPENDING TO EFFECTS")
                        result_effects.append((description, str(problem_level), variable, data_env, solution))
                        print(result_effects)
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
#get the environmental values from the sensors   #TODO: semplificare e velocizzare, magari con un template
def get_real_environment_variables(states):
    #print(states)
    #states = json.loads(states)
    environmentVariables = {}
    classes = set(["temperature", "humidity", "illuminance", "window", "door", "energy", "motion", "sound_pressure", "aqi", "battery", "power", "pm25", "enum", "atmospheric_pressure", "carbon_dioxide", "wind_speed", "pressure", "precipitation_intensity", "distance", "precipitation", "timestamp"])
    state_class = set(["measurement"])

    def process_entity(entity, class_type=None):
        entity_id = entity["entity_id"]
        attributes = entity["attributes"]
        idDevice = client.get_device_id_from_entity_id(entity_id)
        if not idDevice:
            print(f"Warning: No device ID found for entity {entity_id}. Skipping.")
            return None
        return {
            "entity_id": entity_id,
            "name": attributes.get("friendly_name"),
            "state": entity["state"],
            "room": client.getRoomDevice(idDevice),  # Placeholder for room retrieval logic
            "class": class_type or attributes.get("device_class") or attributes.get("state_class"),
            "unit_of_measurement": attributes.get("unit_of_measurement"),
            "options": attributes.get("options")
        }

    for entity in states:
        attributes = entity.get("attributes", {})
        
        if "device_class" in attributes and attributes["device_class"] in classes:
            environmentVariables[entity["entity_id"]] = process_entity(entity)
        
        elif "state_class" in attributes and attributes["state_class"] in state_class and "device_class" not in attributes:
            environmentVariables[entity["entity_id"]] = process_entity(entity)
        
        elif "state_class" not in attributes and "device_class" not in attributes:
            environmentVariables[entity["entity_id"]] = process_entity(entity, class_type=None)

    return environmentVariables


def call_find_solution_llm(user_goal: str, fuzzy_rule_activated: str, automation_description: str):
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
def detectGoalAdvisor(states):
  
    environmentVariables = get_real_environment_variables(states)  #recupera dati del contesto reale
    #print("environmentVariables")
    #print(environmentVariables)
   
    rules =  getAutomationsInfo(states) #recupero le automazioni dell'utente  

    goalAdvisor = {elemento: {} for elemento in ["temperature", "aqi", "co2", "illuminance", "energy", "sound_pressure", "humidity"]}

    for automation in rules:           
        ruleName = automation.get("alias", None)   
        entityId = automation.get("entity_id", None)
        id_automation = automation.get("id", None)
        actions = automation.get("actions", [])  #recupero le azioni delle automazioni
        print("analysing automation: ", ruleName, " with entity_id: ", entityId, " and id_automation: ", id_automation)
        for index, action in enumerate(actions):
            print("analysing action: ", action, " with index: ", index)
            
            if isinstance(action, str):
                continue # Le azioni devono essere dizionari, salta il ciclo se è una stringa
            service = action.get("service")
            #entity_id = action.get("entity_id", None)
            domain = service.split('.')[0] if service else action.get("domain")

            device_id = get_device_id(action)
            
            if not device_id:
                continue

            
            nameDevice = getNameUserDevice(device_id)

            if(nameDevice == None or nameDevice == "None"):
                nameDevice = device_id

            area_id = action.get("target", {}).get("area_id")

            if (area_id == None):
                area_id = client.getRoomDevice(device_id)

            eventType = getEventType(action)
            type = getTextType(eventType)
            
            
            if not device_id and not area_id:
                continue
 
            area = area_id

            #recupero le variabili di contesto influenzate dalle azioni
            contextVar = getContextVariables(list_devices, domain, eventType)
            #print("contextVar involved in the action: ", contextVar)
            for key, values in contextVar.items():
                #print("calling getNegative for key: ", key + ", values: ", values)
                #print("the device is : ", nameDevice)
                effect = key
                variables = values
                for variable in variables:


                    negativeEffect = getNegative(list_variables_goals, effect, variable, userGoal, area, nameDevice, "real", environmentVariables, entityId)
                    #print("negativeEffect")
                    #print(negativeEffect)

                    if negativeEffect != None and len(negativeEffect) > 0: 
                        #print("INSIDE A NEGATIVE EFFECT")
                        #print("negativeEffect: ", negativeEffect)
                        deviceName = getNameUserDevice(device_id)
                        if(deviceName == 'None'):
                            deviceName = device_id
       
                        goalAdvisor[variable][str(entityId)+str(index)] = {
                            "type_action": type,
                            "device": deviceName,
                            "negative_effects": negativeEffect,
                            "automation_name": ruleName,
                            "automation_id": id_automation
                        }

                        # Creazione del documento
                        documento = {
                            "automation_name": ruleName,
                            "automation_id": id_automation,
                            "negative_effects": negativeEffect,
                            "timestamp": datetime.now(),
                            "goal": userGoal
                        }

                        # Inserimento del documento nella collezione
                        #collection_goal_advisor_log.insert_one(documento)
                        #print("Document inserted into goal_advisor_log collection:")
                        #print(documento)
            
    return goalAdvisor






client = ha_client.HomeAssistantClient(base_url=HA_BASE_URL, token=HA_TOKEN)
states = client.get_all_states()  # Get all states (already a Python list/dict)
# --- End Testing Setup ---

detectGoalAdvisor(states)
