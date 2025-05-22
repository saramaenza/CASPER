from pymongo import MongoClient
import pickle
from datetime import datetime
from .utils import format_device_list
from bson.objectid import ObjectId

# Connessione globale al database
client = MongoClient("mongodb://localhost:27017/")
db = client["casper"]  # Sostituisci con il tuo nome del database

def set_db(db_name):
    global db
    db = client[db_name]

def update_state(user_id, session_id, state):
    try:
        state_str = str(state)  # Ottieni la rappresentazione in stringa dello stato
        collection = db["states"]
        this_state = collection.find_one({"user_id": user_id, "session_id": session_id})
        if this_state is not None:
            collection.update_one(
                {"_id": this_state["_id"]},
                {"$set": {"state": state_str, "last_update": datetime.now()}}
            )
        else:
            collection.insert_one({
                "user_id": user_id,
                "session_id": session_id,
                "state": state_str,
                "created": datetime.now(),
                "last_update": datetime.now()
            })
    except Exception as e:
        print("--> Update State Error <--")
        print(user_id, session_id)
        print(e)
        print("----------------")
        
def get_state(user_id, session_id):
    try:
        collection = db["states"]
        this_state = collection.find_one({"user_id": user_id, "session_id": session_id})
        if this_state is not None:
            deserialized = pickle.loads(this_state['state'])
            return deserialized
        else:
            return None
    except Exception as e:
        print("--> Get State Error <--")
        print(user_id, session_id)
        print(e)
        print("----------------")
        return None

def remove_state(user_id, session_id):
    try:
        collection = db["states"]
        this_state = collection.find_one({"user_id": user_id, "session_id": session_id})
        if this_state is not None:
            collection.delete_one({"_id": this_state["_id"]})
    except Exception as e:
        print("--> Remove State Error <--")
        print(user_id, session_id)
        print(e)
        print("----------------")

def get_automations(user_id):
    print(f"Get Automations: {user_id}")
    try:
        collection = db["automations"]
        automations = collection.find_one({"user_id": user_id})
        return automations['automation_data'] if automations else []
    except Exception as e:
        print("--> Get Automations Error <--")
        print(e)
        print("----------------")
        return None

def get_automation(user_id, automation_id):
    try:
        collection = db["automations"]
        automation = collection.find_one({"user_id": user_id})
        if automation and 'automation_data' in automation:
            for auto in automation['automation_data']:
                if auto['id'] == automation_id:
                    return auto['config']
        return None
    except Exception as e:
        print("--> Get Automation by ID Error <--")
        print(e)
        print("----------------")
        return e


def get_devices(user_id):
    try:
        collection = db["config"]
        device = collection.find_one({"user_id": user_id})
        return format_device_list(device['selected'])
        #return device['selected']
    except Exception as e:
        print("--> Get Device Error <--")
        print(e)
        print("----------------")
        return None

def get_user_name(user_id):
    try:
        collection = db["users"]
        user = collection.find_one({"_id": ObjectId(user_id)})
        return user['name'] if user else ""
    except Exception as e:
        print("--> Get User Name Error <--")
        print(e)
        print("----------------")
        return None

def get_problem(user_id, problem_id=None):
    """
    Restituisce la lista dei problemi per l'utente specificato.
    Eventualmente anche il problema specifico.
    """
    try:
        collection = db["problems"]
        problems = collection.find_one({"user_id": user_id})
        if problems is not None:
            if problem_id is not None:
                for problem in problems['problems']:
                    if problem['id'] == problem_id:
                        return problem
            else:
                return problems['problems']
        else:
            return None
        return problems['problems'] if problems else []
    except Exception as e:
        print("--> Get Problem Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return None


def post_problem(user_id, input_problem):
    """
    Aggiunge un problema alla lista dei problemi per l'utente specificato.
    input_problem(s): list -> [dict -> {'id': str, 'type': str...}, {...}]
    input_roblem e sempre una lista anche se contiene un solo problema.
    """
    try:
        collection = db["problems"]
        problems = collection.find_one({"user_id": user_id})
        if problems is not None:
            p_len = len(problems['problems'])
            for index in range(len(input_problem)):
                input_problem[index]['id'] = str(p_len + index + 1)
            problems['problems'].extend(input_problem)
            collection.update_one(
                {"_id": problems["_id"]},
                {"$set": {"problems": problems['problems'], "last_update": datetime.now()}}
            )
        else:
            for index in range(len(input_problem)):
                input_problem[index]['id'] = str(index + 1)
            collection.insert_one({
                "user_id": user_id,
                "problems": input_problem,
                "created": datetime.now(),
                "last_update": datetime.now()
            })
            #ritorna solamente i problemi appena inseriti
        return input_problem or None
    except Exception as e:
        print("--> Post Problem Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return e

def save_tmp_data(user_id, data):
    """
    Salva i dati temporanei per l'utente e la sessione specificati 
    data: dict -> {'automation': JSON string, 'checks': dict -> {'conflict':str -> "To do"/"Done", 'energy': str}}
    """
    try:
        collection = db["temp_data"]
        this_state = collection.find_one({"user_id": user_id})
        if this_state is not None:
            collection.update_one(
                {"_id": this_state["_id"]},
                {"$set": {"data": data, "last_update": datetime.now()}}
            )
        else:
            collection.insert_one({
                "user_id": user_id,
                "data": data,
                "created": datetime.now(),
                "last_update": datetime.now()
            })
        return True
    except Exception as e:
        print("--> Save Temp Automation Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return e
    
def get_tmp_data(user_id):
    try:
        collection = db["temp_data"]
        this_state = collection.find_one({"user_id": user_id})
        if this_state is not None:
            return this_state['data']
        else:
            return None
    except Exception as e:
        print("--> Get Temp Automation Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return e

def remove_tmp_data(user_id):
    try:
        collection = db["temp_data"]
        this_state = collection.find_one({"user_id": user_id})
        if this_state is not None:
            collection.delete_one({"_id": this_state["_id"]})
    except Exception as e:
        print("--> Remove Temp Automation Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return e