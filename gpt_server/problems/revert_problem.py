from problems.goal_advisor import get_device_id, call_find_solution_llm
import sys # Added for testing
import os # Added for testing
# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import db_functions as _db

def detectRevertProblem(automation, goal, user_id, ha_client_instance):
    goalAdvisor_array = []
      
    ruleName = automation.get("alias", None)   
    description = automation.get("description", None)
    id_automation = automation.get("id", None)
    actions = automation.get("actions", []) or automation.get("action", [])
    for index, action in enumerate(actions):
     
        entity_id = action.get("entity_id", None)
        if entity_id is None:
            entity_id = action.get("target", {}).get("entity_id", None)

        service = action.get("service")

        device_id = get_device_id(action)
        
        if not device_id:
            continue
        nameDevice = ha_client_instance.get_device_name_by_user(device_id)
        if(nameDevice == None or nameDevice == "None"):
            nameDevice = device_id

        area_id = action.get("target", {}).get("area_id")

        if (area_id == None):
            area_id = ha_client_instance.getRoomDevice(device_id)  

        eventType = action.get("type", None)
        if eventType is None:
            eventType = service.split('.')[1] 

        if not device_id and not area_id:
            continue
        area = area_id

        find_revert_problem_result = find_revert_problem(eventType, nameDevice, device_id, description, goal, user_id, ha_client_instance, automation) 
        if find_revert_problem_result != None and len(find_revert_problem_result) > 0: 

            unique_id_chain = f"{id_automation}_{device_id}_{area}_revert_{goal}"

            goalAdvisor_array.append({
                "type": "goal_advisor",
                "unique_id": unique_id_chain,
                "negative_effects": find_revert_problem_result,
                "goal": goal,
                "state": "on",
                "rules": [{
                    "id": id_automation,
                    "name": ruleName,
                    "description": description,
                }]
            })

    return goalAdvisor_array


def find_revert_problem(eventType, nameDevice, device_id, automation_description, userGoal, user_id, ha_client_instance, automation):
    result_effects = []
    if userGoal == "energy":
        if eventType == "turn_on":
            has_oppositive_action = False
            rules = _db.get_automations(user_id)
            for rule2 in rules:
                rule2 = rule2['config']
                actions2 = rule2.get("actions", []) or rule2.get("action", [])
                for action2 in actions2:
                    type2 = action2.get("type", None)
                    if type2 is None:
                        service2 = action2.get("service")
                        if service2 is None:
                            action_field = action2.get("action")
                            if action_field is not None and "." in action_field:
                                type2 = action_field.split('.')[1]
                            if type2 is None:
                                continue
                        else:
                            type2 = service2.split('.')[1] 
                    
                    id_device2 = get_device_id(action2)
                    nameDevice2 = ha_client_instance.get_device_name_by_user(id_device2)
                    if nameDevice2 == nameDevice or id_device2 == device_id:
                        if type2 == "turn_off":
                            has_oppositive_action = True
            if(has_oppositive_action == False):
                problem_description = "Questa automazione accende l'oggetto "+nameDevice+" ma non esiste un'automazione che lo spegne."
                solution_info = call_find_solution_llm(userGoal, problem_description, automation_description, user_id)
                if(solution_info is not None):
                    solution = solution_info
                else:
                    solution = ""
                result_effects.append((problem_description, problem_description, "", [], solution))

        if userGoal == "security":
            dangerous_device_keywords = ["forno", "stufetta", "heater", "oven", "stove", "radiator", "riscaldamento", "stufa", "fornello"]
        
            if eventType == "turn_on" and any(keyword in nameDevice.lower() for keyword in dangerous_device_keywords):

                # Controlla se esiste già un'automazione di sicurezza per questo dispositivo
                has_security_automation = False
                rules = _db.get_automations(user_id)
                
                # Prima controlla se l'automazione corrente ha già condizioni di sicurezza
                current_automation = None
                for rule in rules:
                    if rule.get('id') == automation.get('id'):
                        current_automation = rule['config']
                        break
                
                # Verifica se l'automazione corrente ha condizioni di presenza
                if current_automation:
                    conditions = current_automation.get("condition", [])
                    for condition in conditions:
                        condition_entity = condition.get("entity_id", "")
                        condition_state = condition.get("state", "")
                        # Se c'è una condizione di presenza, considera l'automazione sicura
                        if ("presenza" in condition_entity.lower() or "presence" in condition_entity.lower()) and condition_state in ["on", "home"]:
                            has_security_automation = True
                            break
                
                if not has_security_automation:
                    for rule2 in rules:
                        rule2 = rule2['config']
                        triggers = rule2.get("trigger", []) or rule2.get("triggers", [])
                        actions2 = rule2.get("actions", []) or rule2.get("action", [])

                        # Controlla i trigger basati sul tempo o sulla presenza con le azioni turn_off
                        for trigger in triggers:
                            trigger_platform = trigger.get("platform", "")
                            if trigger_platform in ["time", "state", "zone"]:  # Time or presence triggers
                                for action2 in actions2:
                                    type2 = action2.get("type", None)
                                    if type2 is None:
                                        service2 = action2.get("service", "")
                                        if "." in service2:
                                            type2 = service2.split('.')[1]
                                    
                                    id_device2 = get_device_id(action2)
                                    if (id_device2 == device_id or 
                                        ha_client_instance.get_device_name_by_user(id_device2) == nameDevice) and type2 == "turn_off":
                                        has_security_automation = True
                                        break
                        
                        if has_security_automation:
                            break
                
                if has_security_automation == False:
                    problem_description = f"Dispositivo potenzialmente pericoloso '{nameDevice}' viene acceso ma non esiste un'automazione di sicurezza per spegnerlo automaticamente dopo un certo tempo o in caso di assenza dell'utente."
                    solution_info = call_find_solution_llm(userGoal, problem_description, automation_description, user_id)
                    if(solution_info is not None):
                        solution = solution_info
                        print(f"DEBUG: Solution found: {solution}")
                    else:
                        solution = ""
                    result_effects.append((problem_description, problem_description, "", [], solution))

    return result_effects

if __name__ == "__main__":
    import os
    from ha_client import HomeAssistantClient
    
    # url HA ufficio
    base_url = "http://luna.isti.cnr.it:8123"
    
    # url HA casa simone
    # base_url = "https://test-home.duckdns.org"
    user_id = "6818c8ac24e5db8f9a0304e5"
    
    # token HA ufficio
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2ODdmNGEyMDg5ZjA0NDc2YjQ2ZGExNWM3ZTYwNTRjYyIsImlhdCI6MTcxMTA5ODc4MywiZXhwIjoyMDI2NDU4NzgzfQ.lsqxXXhaSBa5BuoXbmho_XsEkq2xeCAeXL4lu7c2LMk"
    
    # Create HomeAssistant client
    ha_client = HomeAssistantClient(base_url, token)
    
    automations_post = {'alias': 'Accendi il Forno alle 19:00', 'description': 'Evento: alle 19:00 (time)\nAzione: accendi il Forno (switch.forno)', 'trigger': [{'platform': 'time', 'at': '19:00:00'}], 'action': [{'service': 'switch.turn_on', 'target': {'entity_id': 'switch.forno'}}], 'mode': 'single', 'id': '2'}
    detector = detectRevertProblem(automations_post, "energy", user_id, ha_client)

    print("Info REVERT: ", detector)