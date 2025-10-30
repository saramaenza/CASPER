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
        return ignored['ignored'] if ignored else {}
    except Exception as e:
        print("--> Get Ignored Suggestions Error <--")
        print(e)
        print("----------------")
        return None
    
def add_single_suggestion_to_solutions(user_id, goal, suggestion):
    """Add a single suggestion to the improvement_solutions collection"""
    try:
        collection = db["improvement_solutions"]
        user_solutions = collection.find_one({"user_id": user_id})
        
        if user_solutions and 'solutions' in user_solutions and 'recommendations' in user_solutions['solutions']:
            # Add the suggestion to the appropriate goal
            goal_key = goal.lower()
            if goal_key not in user_solutions['solutions']['recommendations']:
                user_solutions['solutions']['recommendations'][goal_key] = []
            
            user_solutions['solutions']['recommendations'][goal_key].append(suggestion)
            
            # Update the document
            collection.update_one(
                {"user_id": user_id},
                {"$set": {"solutions": user_solutions['solutions']}}
            )
            return True
        return False
    except Exception as e:
        print("--> Add Single Suggestion Error <--")
        print(e)
        print("----------------")
        return False
    
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
        
        if device and 'selected' in device:
            return format_device_list(device['selected'])
        else:
            return None
    except Exception as e:
        print("--> Get Device Error <--")
        print(e)
        print("----------------")
        return None

def get_config(user_id):
    try:
        collection = db["config"]
        config = collection.find_one({"user_id": user_id})
        
        if config and 'selected' in config:
            return config['selected']
        else:
            return None
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
    Evita duplicati sia nel DB che tra i problemi in input.
    """
    try:
        collection = db["problems"]
        problems = collection.find_one({"user_id": user_id})
        existing_unique_ids = set()
        if problems is not None and 'problems' in problems:
            existing_unique_ids = {p['unique_id'] for p in problems['problems']}

        batch_unique_ids = set()
        new_problems = []
        p_len = len(problems['problems']) if problems and 'problems' in problems else 0

        for prob in input_problem:
            uid = prob['unique_id']
            if uid not in existing_unique_ids and uid not in batch_unique_ids:
                prob['id'] = str(p_len + len(new_problems) + 1)
                prob['ignore'] = False
                prob['solved'] = False
                new_problems.append(prob)
                batch_unique_ids.add(uid)

        if problems is not None:
            if new_problems:
                problems['problems'].extend(new_problems)
                collection.update_one(
                    {"_id": problems["_id"]},
                    {"$set": {"problems": problems['problems'], "last_update": datetime.now()}}
                )
            return new_problems or None
        else:
            for idx, prob in enumerate(new_problems):
                prob['id'] = str(idx + 1)
            collection.insert_one({
                "user_id": user_id,
                "problems": new_problems,
                "created": datetime.now(),
                "last_update": datetime.now()
            })
            return new_problems or None
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
    
def solved_problems_with_automation(user_id, automation_id):
    """
    Setta come "solved" i problemi e gli obiettivi che coinvolgono l'automazione con id specificato
    nelle collezioni "problems" e "goals".
    """
    try:
        # Aggiorna la collezione "problems"
        collection_problems = db["problems"]
        problems = collection_problems.find_one({"user_id": user_id})
        
        if problems and 'problems' in problems:
            updated_problems = []
            for problem in problems['problems']:
                if automation_id in [rule.get('id') for rule in problem.get('rules', [])]:
                    problem['solved'] = True  # Imposta "solved" a True
                    problem['last_update'] = datetime.now()
                updated_problems.append(problem)
            
            # Aggiorna il documento nel database
            collection_problems.update_one(
                {"_id": problems["_id"]},
                {"$set": {"problems": updated_problems, "last_update": datetime.now()}}
            )
            print("Problemi aggiornati nella collezione 'problems'.")

        # Aggiorna la collezione "goals"
        collection_goals = db["goals"]
        goals = collection_goals.find_one({"user_id": user_id})
        
        if goals:
            updated_goals = {}
            for goal_key, goal_items in goals.items():
                if goal_key not in ["_id", "user_id", "created", "last_update"]:
                    updated_goal_items = []
                    for item in goal_items:
                        if automation_id in [rule.get('id') for rule in item.get('rules', [])]:
                            item['solved'] = True  # Imposta "solved" a True
                            item['last_update'] = datetime.now()
                        updated_goal_items.append(item)
                    updated_goals[goal_key] = updated_goal_items
            
            # Aggiorna il documento nel database
            collection_goals.update_one(
                {"_id": goals["_id"]},
                {"$set": {**updated_goals, "last_update": datetime.now()}}
            )
            print("Obiettivi aggiornati nella collezione 'goals'.")

        return True
    except Exception as e:
        print("--> Solved Problems With Automation Error <--")
        print(user_id, automation_id)
        print(e)
        print("----------------")
        return False
    
def save_automation(user_id, automation_id, config):
    """
    Salva una singola automazione per l'utente specificato.
    user_id: str -> ID dell'utente
    automation_id: str -> ID dell'automazione
    config: dict -> Configurazione dell'automazione
    """
    try:
        ##Prima provo a salvare l'automazione su Home Assistant, se tutto va bene, salvo su MongoDB
        """
        auth = get_credentials(user_id)
        ha = HomeAssistantClient(auth['url'], auth['key'])
        response = ha.save_automation(config, automation_id)
        if response['result'] != "ok":
            print(f"Error saving automation {automation_id} for user {user_id}: {response['error']}")
            return "Error saving the automation to Home Assistant."
        """
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
                id_automation = user_automations['automation_data'][automation_index]['id']
                # Setta come "solved" i problemi che coinvolgono questa automazione
                solved_problems_with_automation(user_id, id_automation)
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

def solve_problem_goal(user_id, problem_id):
    """
    Segna un problema come risolto per l'utente specificato.
    user_id: str -> ID dell'utente
    problem_id: str -> ID del problema da risolvere
    """
    try:
        collection = db["goals"]
        problems_goals = collection.find_one({"user_id": user_id})
        if problems_goals is not None:
            updated_goals = {}
            for goal_key, goal_items in problems_goals.items():
                if goal_key not in ["_id", "user_id", "created", "last_update"]:
                    updated_goal_items = []
                    for problem in goal_items:
                        if problem['id'] == problem_id:
                            problem['solved'] = True
                        updated_goal_items.append(problem)
                    updated_goals[goal_key] = updated_goal_items
            
            collection.update_one(
                {"_id": problems_goals["_id"]},
                {"$set": {**updated_goals, "last_update": datetime.now()}}
            )
            return True
        return False
    except Exception as e:
        print("--> Solve Problem Goal Error <--")
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