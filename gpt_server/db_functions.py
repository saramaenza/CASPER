from pymongo import MongoClient
import pickle
from datetime import datetime
from utils import format_device_list, format_entity_id
from bson.objectid import ObjectId
from ha_client import HomeAssistantClient

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
    try:
        collection = db["automations"]
        automations = collection.find_one({"user_id": user_id})
        return automations['automation_data'] if automations else []
    except Exception as e:
        print("--> Get Automations Error <--")
        print(e)
        print("----------------")
        return None

def get_ignored_suggestions(user_id):
    try:
        collection = db["ignored_suggestions"]
        ignored = collection.find_one({"user_id": user_id})
        return ignored['ignored'] if ignored else []
    except Exception as e:
        print("--> Get Ignored Suggestions Error <--")
        print(e)
        print("----------------")
        return None
    
def insert_improvement_solution(user_id, solutions):
    """Inserisce le soluzioni generate nella collezione improvement_solutions."""
    try:

        # Aggiungi ignore e solved a ogni raccomandazione di ogni goal
        if 'recommendations' in solutions and isinstance(solutions['recommendations'], dict):
            for goal_recs in solutions['recommendations'].values():
                if isinstance(goal_recs, list):
                    for rec in goal_recs:
                        rec['ignore'] = False
                        rec['solved'] = False
                        rec['unique_id'] = str(ObjectId())  

        collection = db["improvement_solutions"]
        # Rimuovi tutte le soluzioni precedenti per questo utente
        collection.delete_many({"user_id": user_id})
        collection.insert_one({
            "user_id": user_id,
            "solutions": solutions
        })
    except Exception as e:
        print("--> Insert Improvement Solution Error <--")
        print(e)
        print("----------------")

def get_ranking_goals(user_id):
    try:
        collection = db["user_preferences"]
        ranking_goals = collection.find_one({"user_id": user_id})
        return ranking_goals['ranking'] if ranking_goals else []
    except Exception as e:
        print("--> Get Ranking Goals Error <--")
        print(e)
        print("----------------")
        return None

def get_automations_states(user_id):
    try:
        collection = db["rules_state"]
        automations = collection.find_one({"user_id": user_id})
        
        if automations and 'automation_data' in automations:
            # Filtra solo le automazioni che hanno is_running = True
            running_automations = [
                automation for automation in automations['automation_data'] 
                if 'is_running' in automation and automation['is_running'] is True
            ]
            return running_automations
        else:
            return []
            
    except Exception as e:
        print("--> Get Automations States Error <--")
        print(e)
        print("----------------")
        return []

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

def get_config(user_id):
    try:
        collection = db["config"]
        return collection.find_one({"user_id": user_id})['selected']
    except Exception as e:
        print("--> Get Config Error <--")
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
    Eventualmente anche il problema specificato per ID o tutti i problemi.
    """
    try:
        collection = db["problems"]
        problems = collection.find_one({"user_id": user_id})
        if problems is not None:
            if problem_id is not None:
                for problem in problems['problems']:
                    if problem['id'] == problem_id and problem.get('state', 'on') == "on" and not problem.get('ignore', False) and not problem.get('solved', False):
                        return problem
            else:
                return problems['problems'] if problems else []
        else:
            return []
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
                input_problem[index]['ignore'] = False
                input_problem[index]['solved'] = False
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

def get_credentials(user_id):
    """
    Restituisce le credenziali dell'utente specificato.
    """
    try:
        collection = db["config"]
        auth = collection.find_one({"user_id": user_id})
        if auth is not None:
            return {
                "url": auth['auth']['url'],
                "key": auth['auth']['token']
            }
        else:
            return None
    except Exception as e:
        print("--> Get Credentials Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return None

def save_automation(user_id, automation_id, config):
    """
    Salva una singola automazione per l'utente specificato.
    user_id: str -> ID dell'utente
    automation_id: str -> ID dell'automazione
    config: dict -> Configurazione dell'automazione
    """
    try:
        ##Prima provo a salvare l'automazione su Home Assistant, se tutto va bene, salvo su MongoDB
        auth = get_credentials(user_id)
        ha = HomeAssistantClient(auth['url'], auth['key'])
        response = ha.save_automation(config, automation_id)
        if response['result'] != "ok":
            print(f"Error saving automation {automation_id} for user {user_id}: {response['error']}")
            return "Error saving the automation to Home Assistant."
        collection = db["automations"]
        user_automations = collection.find_one({"user_id": user_id})
        alias = config.get('alias', 'Unnamed Automation')
        
        if user_automations:
            # Trova l'indice dell'automazione esistente
            automation_index = -1
            automation_state = "on"  # Default state for new automations
            for i, auto in enumerate(user_automations['automation_data']):
                if auto['id'] == automation_id:
                    automation_index = i
                    automation_state = auto['state']
                    break
            
            automation_data = {
                "id": automation_id,
                "entity_id": f"automation.{format_entity_id(config['alias'])}",
                "state": automation_state,
                "config": config
            }
            
            if automation_index != -1:
                # Aggiorna automazione esistente
                user_automations['automation_data'][automation_index] = automation_data
            else:
                # Aggiungi nuova automazione
                user_automations['automation_data'].append(automation_data)
                post_rule_state(user_id, f"automation.{format_entity_id(config['alias'])}", automation_id, alias)
            
            collection.update_one(
                {"user_id": user_id},
                {"$set": {"automation_data": user_automations['automation_data'], "last_update": datetime.now()}}
            )
        else:
            # Crea una nuova voce per l'utente se non esiste
            collection.insert_one({
                "user_id": user_id,
                "automation_data": [{
                    "id": automation_id,
                    "entity_id": f"automation.{format_entity_id(config['alias'])}",
                    "state": "on",
                    "config": config
                }],
                "created": datetime.now(),
                "last_update": datetime.now()
            })
            post_rule_state(user_id, f"automation.{format_entity_id(config['alias'])}", automation_id, alias)
        return True
    except Exception as e:
        print("--> Save Single Automation Error <--")
        print(user_id, automation_id)
        print(e)
        print("----------------")
        return e

def post_rule_state(user_id, entity_id, automation_id, alias):
    try:
        collection_rule_state = db["rules_state"] 
        user_rules = collection_rule_state.find_one({"user_id": user_id})
        if user_rules:
            automation_data = {
                "id": automation_id,
                "alias": alias,
                "state": "unknown",  # Default state
                "entity_id": entity_id,
                "time": datetime.now().isoformat()
            }
            user_rules['automation_data'].append(automation_data)
            collection_rule_state.update_one(
                {"user_id": user_id},
                {"$set": {"automation_data": user_rules['automation_data'], "last_update": datetime.now()}}
            )
        else:
            collection_rule_state.insert_one({
                "user_id": user_id,
                "automation_data": [{
                    "id": automation_id,
                    "alias": alias,
                    "state": "unknown",
                    "entity_id": entity_id,
                    "time": datetime.now().isoformat()
                }],
                "last_update": datetime.now()
            })
        return True
    except Exception as e:
        print("--> Post Rule State Error <--")
        print(user_id, entity_id, automation_id)
        print(e)
        print("----------------")
        return e

def solve_problem(user_id, problem_id, automation, automation_natural_language):
    """
    Segna un problema come risolto per l'utente specificato.
    user_id: str -> ID dell'utente
    problem_id: str -> ID del problema da risolvere
    """
    try:
        collection = db["problems"]
        problems = collection.find_one({"user_id": user_id})
        if problems is not None:
            for problem in problems['problems']:
                if problem['id'] == problem_id:
                    problem['solved'] = True
                    problem['solution'] = {
                        "automation": automation,
                        "natural_language": automation_natural_language
                    }
                    collection.update_one(
                        {"_id": problems["_id"]},
                        {"$set": {"problems": problems['problems'], "last_update": datetime.now()}}
                    )
                    return True
        return False
    except Exception as e:
        print("--> Solve Problem Error <--")
        print(user_id, problem_id)
        print(e)
        print("----------------")
        return e
    
def post_goal(user_id, goal, goal_body):
    """
    Aggiunge un obiettivo alla lista degli obiettivi per l'utente specificato.
    Se esiste già un elemento con lo stesso unique_id, incrementa il contatore invece di aggiungere un duplicato.
    goal_body: array[dict -> {'id': str, 'type': str, 'unique_id': str, ...}]
    """
    try:
        collection = db["goals"]
        goals = collection.find_one({"user_id": user_id})
        
        if goals is not None:
            if goal in goals:
                max_id = max([int(g['id']) for g in goals[goal]], default=0)
            else:
                max_id = 0
                goals[goal] = []
            
            # Processa ogni elemento in goal_body
            for new_goal in goal_body:
                unique_id = new_goal.get('unique_id')
                existing_goal = None
                
                # Cerca se esiste già un elemento con lo stesso unique_id
                if unique_id:
                    for existing in goals[goal]:
                        if existing.get('unique_id') == unique_id:
                            existing_goal = existing
                            break
                
                if existing_goal:
                    # Incrementa il contatore se l'elemento esiste già
                    existing_goal['count'] = existing_goal.get('count', 1) + 1
                    existing_goal['last_detected'] = datetime.now()
                    print(f"Goal with unique_id {unique_id} already exists. Counter incremented to {existing_goal['count']}")
                else:
                    # Aggiungi nuovo elemento se non esiste
                    max_id += 1
                    new_goal['id'] = str(max_id)
                    new_goal['count'] = 1
                    new_goal['first_detected'] = datetime.now()
                    new_goal['last_detected'] = datetime.now()
                    new_goal['ignore'] = False
                    new_goal['solved'] = False
                    goals[goal].append(new_goal)
            
            collection.update_one(
                {"_id": goals["_id"]},
                {"$set": {goal: goals[goal], "last_update": datetime.now()}}
            )
        else:
            # Crea nuovo documento se non esiste
            for index, new_goal in enumerate(goal_body):
                new_goal['id'] = str(index + 1)
                new_goal['count'] = 1
                new_goal['first_detected'] = datetime.now()
                new_goal['last_detected'] = datetime.now()
                new_goal['ignore'] = False
                new_goal['solved'] = False
            
            collection.insert_one({
                "user_id": user_id,
                goal: goal_body,
                "created": datetime.now(),
                "last_update": datetime.now()
            })
        
        return goal or None
    except Exception as e:
        print("--> Post Goal Error <--")
        print(user_id)
        print(e)
        print("----------------")
        return e

def get_problems_goals(user_id):
    """
    Recupera i dati dalla collezione goals per un utente specifico
    """
    try:
        collection = db['goals']
        
        # Cerca il documento per l'utente
        user_goals = collection.find_one({"user_id": user_id})
        
        return user_goals if user_goals else {}
        
    except Exception as e:
        print(f"Errore nel recupero dei dati dalla collezione goals: {e}")
        return {}
        
    
def get_active_users():
    """
    Restituisce una lista di tutti gli user_id degli utenti nel database.
    """
    try:
        collection = db["automations"]
        # Trova tutti i documenti e ottieni solo i user_id distinti
        users = collection.distinct("user_id")
        return [{'id': user_id} for user_id in users]
    except Exception as e:
        print(f"Error getting active users: {e}")
        return []