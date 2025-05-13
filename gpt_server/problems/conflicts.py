import json
import requests
from requests import get, post
import re
import ast
import db_functions as _db

#url HA ufficio
base_url = "http://luna.isti.cnr.it:8123"
	
#url HA casa simone
#base_url = "https://test-home.duckdns.org"


#token HA ufficio
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk"



	
headers = {
    "Authorization": "Bearer " + token,
    "content-type": "application/json",
}

# Load JSON file
with open("casper.all.json", "r") as file:
    all_rules_all = json.load(file)

#with open("casper.new_automation.json", "r") as file: #questa dà conflitto possibile, ma sarebbe certo (è per come è stato creato il file dell'automazione)
#    automations_post = json.load(file)

#with open("casper.new_automation_2.json", "r") as file: #conflitto certo (ok)
    #automations_post = json.load(file)


all_rules = [all_rules_all["automation_data"][13]["config"]]
automations_post = all_rules_all["automation_data"][14]["config"]


infoConflictArrayLLM = []   #contiene le coppie di automazioni in conflitto tra loro


#########  STUFF FOR GETTING SOLUTIONS #########

def call_find_solution_llm(automation1):
    return "a solution"
    # Costruzione del payload
    payload = {
        'sentence': automation1
    }

    # Esecuzione della richiesta POST
    try:
        #https://giove.isti.cnr.it:2684/solutions/conflict
        #http://localhost:5000/solutions/conflict
        
        response = requests.post("http://localhost:5000/solutions_llm/conflict", json=payload)
        #GIOVE
        #response = requests.post("https://giove.isti.cnr.it:2684/solutions_llm/conflict", json=payload)
        
        # Controllo dello stato della risposta
        if response.status_code == 200:
            # Converti la risposta JSON in un oggetto Python
            result = response.json()
            return result
        else:
            print(f"Errore: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        print(f"Errore nella richiesta: {e}")
        return None




#########  STUFF FOR CONFLICT ON ACTIONS #########

def process_action_conflict(action1, action2, ruleName1, ruleName2, entityRuleName1, entityRuleName2, domainTrigger1, domainTrigger2, condition1, condition2, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2, automation1_description, automation2_description):
    device_id1, area1, attr1, domain1 = process_action(action1)
    device_id2, area2, attr2, domain2 = process_action(action2)

    if not device_id1 and not area1 or not device_id2 and not area2:
        return

    if not device_id1 and area1:
        entitiesByDomainAndArea1 = getEntitiesByDomainAndArea(area1, domain1)
        device_id1 = getDevicesId(entitiesByDomainAndArea1)

    if not device_id2 and area2:
        entitiesByDomainAndArea2 = getEntitiesByDomainAndArea(area2, domain2)
        device_id2 = getDevicesId(entitiesByDomainAndArea2)

    arrayDeviceActionId1 = device_id1.split(", ") if isinstance(device_id1, str) else device_id1 #???
    arrayDeviceActionId2 = device_id2.split(", ") if isinstance(device_id2, str) else device_id2 #???

    if type_of_conflict == "possible" and not arrayDeviceActionId2:
        return

    common_device = [element for element in arrayDeviceActionId1 if element in set(arrayDeviceActionId2)]
    if not common_device:
        return

    deviceNameAction1 = getNameUserDevice(common_device[0]) or common_device[0]
    deviceNameAction2 = deviceNameAction1 # ???

    infoPlatform1 = getInfoPlatform(domain1, action1)
    infoPlatform2 = getInfoPlatform(domain2, action2)

    if checkOperatorsAppliances(getEventType(action1), getEventType(action2)) and not attr1 and not attr2:
        append_conflict(ruleName1, ruleName2, getEventType(action1), getEventType(action2), None, None, None, None, "", "", infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction2, condition1, condition2, getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2)
    elif attr1 or attr2:
        dataAttr = attr1 if attr1 else attr2
        for data in dataAttr:
            nameAttribute1 = data
            nameAttribute2 = data
            valueAttribute1 = attr1.get(data, None)
            valueAttribute2 = attr2.get(data, None)
            if valueAttribute1 and valueAttribute2 and valueAttribute1 != valueAttribute2:
                append_conflict(ruleName1, ruleName2, getEventType(action1), getEventType(action2), valueAttribute1, valueAttribute2, nameAttribute1, nameAttribute2, deviceNameAction1, deviceNameAction2, infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction2, condition1, condition2, getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2)
            elif (valueAttribute1 and not valueAttribute2) or (not valueAttribute1 and valueAttribute2):
                #(name_rule1, name_rule2, trigger_type_rule1, trigger_type_rule2, action_type_rule1, action_type_rule2, device_name_rule1, device_name_rule2 ):
                if not check_element_exists(ruleName1, ruleName2, None, None, getEventType(action1), getEventType(action2), deviceNameAction1, deviceNameAction2):
                    if checkOperatorsAppliances(getEventType(action1), getEventType(action2)):
                        append_conflict(ruleName1, ruleName2, getEventType(action1), getEventType(action2), None, None, None, None, deviceNameAction1, deviceNameAction2, infoPlatform1, infoPlatform2, domainTrigger1, domainTrigger2, deviceNameAction1, deviceNameAction2, condition1, condition2, getDeviceClass(deviceNameAction1), automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2)

def has_attributes(action):
    data = action.get("data", {})
    return data


def get_device_id(action):
    target = action.get("target", {})
    device_id = action.get("device_id") or target.get("device_id") or action.get("entity_id") or target.get("entity_id")
    if device_id:
        device_id = re.sub(r'[\'\[\]]', '', str(device_id))
    return device_id


def check_element_exists(name_rule1, name_rule2, trigger_type_rule1, trigger_type_rule2, action_type_rule1, action_type_rule2, device_name_rule1, device_name_rule2 ):
    for element in infoConflictArrayLLM:
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

#restituisce la device_class del dispositivo
def getDeviceClass(friendly_name):
	template =  '{% for sensor in states %}{% if sensor.attributes.friendly_name == "'+friendly_name+'" %}{{ sensor.attributes.device_class }}{% endif %}{% endfor %}'
	return getTemplateData(template)
	

# Function to check if id_conflict is already in the array
def is_conflict_present(conflict_array, id_conflict):
    for conflict in conflict_array:
        if conflict.get("id_conflict") == id_conflict:
            return True
    return False   


def append_conflict(ruleName1, ruleName2, type1, type2, optionalValue1, optionalValue2, typeOptionalValue1, typeOptionalValue2, nameApplianceTrigger1, nameApplianceTrigger2, typeTrigger1, typeTrigger2, domainTrigger1, domainTrigger2, nameApplianceAction1, nameApplianceAction2, condition1, condition2, device_class1, automation1_description, automation2_description, type_of_conflict, type_of_front_end, idAutomation1, idAutomation2):  
    if(type_of_front_end == "llm"):
        solution_info = call_find_solution_llm(automation1_description) 
        id_conflict = str(idAutomation1)+"_"+str(idAutomation2)
        # Check if the conflict is already present before appending
        if not is_conflict_present(infoConflictArrayLLM, id_conflict):
            infoConflictArrayLLM.append({
                "id_conflict": id_conflict,
                "rule1_id": idAutomation1,
                "rule1_name": ruleName1,
                "rule2_id": idAutomation2,
                "rule2_name": ruleName2,
                "possibleSolutions": solution_info,
                "type": type_of_conflict,
            })


def process_action(action):
    if isinstance(action, str):
        return None, None, False, None
    device_id = get_device_id(action)
    service = action.get("service")
    domain = service.split('.')[0] if service else None
    has_attrs = has_attributes(action)
    area_id = action.get("target", {}).get("area_id")
    return device_id, area_id, has_attrs, domain


#get entities in a room
def getEntitiesByArea(area):
	template =  '{{ area_entities("'+area+'") }}'
	return getTemplateData(template)


def getEntitiesByDomainAndArea(area, domain):
    area = ' '.join(area)
    entitiesByArea = getEntitiesByArea(area)
    entitiesByArea = ast.literal_eval(entitiesByArea)          
    entitiesByDomainAndArea = [item for item in entitiesByArea if item.startswith(domain)]
    return entitiesByDomainAndArea



def getInfoZone(user, zone, event):
    user = getFriendlyName(user)
    zone = getFriendlyName(zone)
    return user + " " + event + " at " + zone


#get the device/sensor ID through its entity_id
def getID(device):
    template =  '{{ device_id("'+device+'") }}'
    return getTemplateData(template)


def getDevicesId(entities):
    devicesId = []
    for e in entities:
        id = getID(e)
        devicesId.append(id)
    return devicesId


def getInfoPlatform(platform, trigger):
    if(platform == "time"):
        return "time is " + trigger['at']
    if(platform == "zone"):
        infoZone = getInfoZone(trigger['entity_id'], trigger['zone'], trigger['event'])
        return infoZone
    if(platform == "sun"):
        return "there is the " + trigger['event']
    return platform



def checkOperatorsAppliances(type1, type2):
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


def getEventType(e):
    type = e.get('type')
    service = e.get("service", None)
    if(e.get("service") != None):
        service = e.get("service") 
    if(type == None and service != None):
        type = re.sub(r'.*?\.', '', service) 
    if(type == None):
        action = e.get("action")
        if(action != None):
            type = re.sub(r'.*?\.', '', action) 
        if(action == None):
            trigger = e.get("trigger")
            if(trigger == "time"):
                type = e.get("at")
    
    return type


########### STUFF FOR TRIGGER/CONDITIONS OVERLAP #########


#get the device name given by the user
def getNameUserDevice(device):
	template =  '{{ device_attr("'+device+'", "name_by_user") }}'
	return getTemplateData(template)

#get the device friendly name through the entity id
def getFriendlyName(entity_id):
	template =  '{{ state_attr("'+entity_id+'", "friendly_name") }}'
	return getTemplateData(template)
	

#Validates an HTTP response and returns the content or raises an error if the response is unsuccessful.
def check_response(response):
    if response.status_code == 200:
        return response.text
    else:
        response.raise_for_status()


#Sends a POST request to the Home Assistant template API to render a provided template.
def getTemplateData(template):
	data = {"template": template}
	url = base_url + "/api/template"
	response = post(url, headers=headers, data=json.dumps(data))
	return check_response(response)

# Print parsed data
#print(data)
def arrayConditions(condition1, condition2):
    conditionInfo1 = []
    conditionInfo2 = []
    if(condition1):
        for c in condition1:
            if("conditions" in c):
                for condition in c["conditions"]:
                    condition = getConditionInfo(condition, c["condition"]) #{"condition":..., "device":..., "type":..., "user":..., "zone":...}
                    conditionInfo1.append(condition)
            elif("condition" in c):
                condition = getConditionInfo(c, c["condition"])
                conditionInfo1.append(condition)
    if(condition2):
        for c in condition2:
            if("conditions" in c):
                for condition in c["conditions"]:
                    condition = getConditionInfo(condition, c["condition"])
                    conditionInfo2.append(condition)
            elif("condition" in c):
                condition = getConditionInfo(c, c["condition"])
                conditionInfo2.append(condition)
    return conditionInfo1, conditionInfo2

def checkCondition(condition1, condition2):
    if (not condition1 or not condition2): #dovrebbe essere AND ?
        return True
    if (condition1 == condition2):
        return True
    for c1 in condition1:
        for c2 in condition2:
            if(c1['condition'] != "or" and c2['condition'] != "or"):
                if(c1.get('device') != None and c2.get('device')!= None and c1.get('type') != None and c2.get('type')!= None):
                    if (c1.get('device') == c2.get('device') and c1.get('type') != c2.get('type')):
                        return False
                    if (c1.get('device') == c2.get('device') and c1.get('type') == c2.get('type')) and (c1['condition'] == 'not' or c2['condition'] == 'not'):
                        return False
                if(c1.get('user') != None and c2.get('user')!= None and c1.get('zone') != None and c2.get('zone')!= None):
                    if (c1.get('user') == c2.get('user') and c1.get('zone') != c2.get('zone')):
                        return False
                    if (c1.get('user') == c2.get('user') and c1.get('zone') != c2.get('zone')) and (c1['condition'] == 'not' or c2['condition'] == 'not'):
                        return False
    return True

def getConditionInfo(condition, typeCondition):
    if("condition" in condition):
        if "device" in condition["condition"]:
            device = condition['device_id']
            device = getNameUserDevice(device)
            typeDevice = condition['type']
            condition = {
                "condition": typeCondition,
                "device": device,
                "type": typeDevice,
            }
        if "zone" in condition["condition"]:
            user = getFriendlyName(condition['entity_id'])
            zone = getFriendlyName(condition['zone'])
            condition = {
                "condition" : typeCondition,
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
                "condition" : typeCondition,
                "after" : after,
                "before": before,
                "weekday": weekday
            }
    return condition

def process_conditions(condition1, condition2):
    if condition1:
        if condition1[0]['condition'] == "or" and len(condition1[0]['conditions']) == 1: #Perche' si modifica l'or in and se c'è una sola condizione? In teoria se c'è una sola condizione non ha senso avere l'or
            condition1[0]['condition'] = "and"
    if condition2:
        if condition2[0]['condition'] == "or" and len(condition2[0]['conditions']) == 1:
            condition2[0]['condition'] = "and"
    return arrayConditions(condition1, condition2)

def find_trigger(automations, id):
    for automation in automations:
        if automation.get("id") == id:
            trigger = automation.get("triggers") or automation.get("trigger")
            return trigger
    return None

def find_condition(automations, id):
    for automation in automations:
        if automation.get("id") == id:
            conditions = automation.get("condition") or automation.get("conditions")
            return conditions
    return None


def process_triggers_and_conditions(rules, idAutomation1, idAutomation2, automations_post=None):
   
    trigger1 = automations_post.get("triggers") or automations_post.get("trigger")
    condition1 = automations_post.get("condition")
   
    trigger2 = find_trigger(rules, idAutomation2)
    condition2 = find_condition(rules, idAutomation2)
    condition1, condition2 = process_conditions(condition1, condition2) 
    return trigger1, condition1, trigger2, condition2






########### MAIN PROBLEM CHECKING FUNCTION #########
import time
def detectAppliancesConflictsForLLM(user_id, rule1):
    rules = _db.get_automations(user_id) #[{"id": automation_id_int, "config": {"id", "alias", "description", "triggers"...}, ...]
    start = time.time()
    infoConflictArrayLLM.clear()

    ruleName1 = rule1.get("alias", None) #None potrebbe tornare errore nella linea successiva
    entityRuleName1 = "automation." + ruleName1.replace(" ", "_") #sostituito con l'alias della nuova automazione spazi -> _
    
    domainTrigger1 = rule1["trigger"][0].get("domain", None) if "trigger" in rule1 and isinstance(rule1["trigger"], list) and rule1["trigger"] else None #trigger o triggerS?
    idAutomation1 = rule1.get("id", None)
    actions1 = rule1.get("actions", []) or rule1.get("action", [])
    
    for action1 in actions1:
        for rule2 in rules:
            ruleName2 = rule2.get("alias", None)
            #entityRuleName2 = rule2["entity_id"]
            entityRuleName2 = "automation." + ruleName2.replace(" ", "_")

            if entityRuleName1 != entityRuleName2:
                # Triggers and conditions overlap (possible/certain conflict)
                domainTrigger2 = rule2["trigger"][0].get("domain", None) if "trigger" in rule2 and isinstance(rule2["trigger"], list) and rule2["trigger"] else None #trigger o triggerS?
                actions2 = rule2.get("actions", []) or rule2.get("action", [])
                idAutomation2 = rule2.get("id", None)
                trigger1, condition1, trigger2, condition2 = process_triggers_and_conditions(rules, idAutomation1, idAutomation2, rule1)
                type_of_conflict = "certain" if trigger1 == trigger2 and checkCondition(condition1, condition2) else "possible"
                
                #print("Trigger1: ", trigger1)
                #print("Condition1: ", condition1)
                #print("Trigger2: ", trigger2)
                #print("Condition2: ", condition2)
                #print("Type of conflict: ", type_of_conflict)
                #print("--------------------------")
                
                # Retrieving automations description (need for solutions)
                # Le soluzioni sarebbero recuperata dal db client['explainTAP'], non so se funzionerà ancora così?

                #automation2_desc = collection_automations_description.find_one({"entity_id": entityRuleName2})
                #automation2_description = automation2_desc["description"] if automation2_desc else ""
                
                # Conflict on actions and solution retrieval
                for action2 in actions2:
                    process_action_conflict(action1, action2, ruleName1, ruleName2, entityRuleName1, entityRuleName2, domainTrigger1, domainTrigger2, condition1, condition2, type_of_conflict, "llm", idAutomation1, idAutomation2, "automation_description", "automation2_description")
    endtime = time.time()
    elapsed_time = endtime - start
    print("Elapsed time: ", elapsed_time, " seconds") 
    return infoConflictArrayLLM

user_id = "6487f4a2089f04476b4d4d8c" #ID utente di test
infoConflictArrayLLM = detectAppliancesConflictsForLLM(user_id, automations_post)

print("Info Conflict Array LLM: ", infoConflictArrayLLM)
