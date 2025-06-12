from copy import deepcopy
import requests
import json
import re

base_url = None
def set_base_url(url, port):
    global base_url
    if port is None or port == "443":
        base_url = f"{url}"
    else:
        base_url = f"{url}:{port}"

def inject_user_id(ai_msg, user_id, session_id):
    tool_calls = []
    for tool_call in ai_msg.tool_calls:
        tool_call_copy = deepcopy(tool_call)
        tool_call_copy["args"]["user_id"] = user_id
        tool_call_copy["args"]["session_id"] = session_id
        tool_calls.append(tool_call_copy)
    return tool_calls

def format_device_list(devices):
    """
    Input:
    devices = [{
    'e': "sensor.sun_next_dawn", 
    'f': "Sun Prossima alba", 
    'a': "Generico", 
    't': "sensor", 
    'd': "Sun", 
    'df': "Sun", 
    'desc': "Sun Prossima alba in Generico (sensor)", 
    unit: null || str,
    options: null || [],
    mode: null || [],
    effects: null || [],
    colors: null || [],
    min: null || int,
    max: null || int
    },
    ...]
    Output:
    !Generico:Sun Prossima alba,sensor.sun_next_dawn, unit:, options:, mode:, effects:, color_mode:, min:, max:|Sun Prossima alba2,sensor.sun_next_dawn2!Generico2:Sun Prossima alba2,sensor.sun_next_dawn2!
    """
    try:
        device_info_names = ['unit', 'options', 'mode', 'effects', 'colors', 'min', 'max']
        device_info_list = {}
        device_list = {}
        for device in devices:
            room = device['a']
            if room not in device_list:
                device_list[room] = []
            if device['e'] not in device_info_list:
                device_info_list[device['e']] = []
            for name in device_info_names:
                if name in device and device[name] is not None:
                    device_info_list[device['e']].append(f"{name}:{device[name]}")

            device_list[room].append([device['f'], device['e'], device_info_list[device['e']]])

        formatted_string = ""
        for room, devices in device_list.items():
            formatted_string += f"!{room}:"
            for device in devices:
                formatted_string += f"{device[0].strip()},{device[1]}"
                if (len(device[2]) == 1):
                    formatted_string += f",{device[2][0]}"
                elif (len(device[2]) > 1):
                    formatted_string += f",{",".join(device[2])}"
                if device != devices[-1]:                  
                    formatted_string += "|"
        formatted_string += "!"
        return formatted_string.strip()
    except Exception as e:
        print("--> Utils.py Format Device List Error <--")
        print(e)
        print("----------------")
        return None

def update_chat_state(action:str, state: str, session_id: str, user_id: str, id:str = ""):
    """
    action: add-state, state: "String", id: --> aggiunge un nuovo stato alla chat con id, l'id e il nome della funzione
    action: modify-state, state: "String", id: --> modifica lo stato con id
    action: confirm-state, state: "Bla bla", id: --> conferma lo stato con id
    action: error-state, state: "", id: 5 --> segnala un errore nello stato con id
    action: send-message, state: "Messaggio intermedio del bot", id Non serve --> invia un messaggio come se fosse rulebot nella chat user id session id
    action: update-automation-list state: "", id: "" --> aggiorna la lista delle automazioni
    action: generate-conflict-card, state: Dict[conflict_info], id: "" --> genera una card per CONFLITTI
    """
    #print(f"Update Chat State: {action} - {state} - {session_id} - {user_id} - {id}")
    try:
        requests.post(f'{base_url}/post_chat_state', json={"action":action, "state": state, "id":id, "session_id": session_id, "user_id": user_id})
    except Exception as e:
        print("--> Update Chat State Error utils.py<--")
        print(e)
        print("----------------")
    return None


def format_entity_id(alias):
    """
    Converte un alias in un entity_id valido seguendo le stesse regole del JavaScript.
    """
    # Converti in minuscolo e sostituisci ° con 'deg'
    entity_id = alias.lower().replace('°', 'deg')
    # Sostituisci sequenze di caratteri non alfanumerici con un singolo underscore
    return re.sub(r'[^a-zA-Z0-9]+', '_', entity_id).strip('_')

"""def save_automation(user_id, session_id, automation_json, automation_id):
    headers = {'Content-Type': 'application/json'}
    payload = {
        'userId': user_id,
        'sessionId': session_id,
        'automationId': automation_id,
        'config': automation_json
    }
    response = requests.post(f'{base_url}/save_automation', headers=headers, data=json.dumps(payload), cookies={"auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFwaSIsInNlc3Npb24iOiJhcGktc2Vzc2lvbiIsIm5hbWUiOiJBcGkiLCJlbWFpbCI6ImFwaSIsImlhdCI6MTczNzcxODU2MH0.TnDcMFF1La5NeCQuDJg54y2lECkHNgZTI07_yL2NioA"})
    return response"""

