from typing import List
import requests
import json
import os
import datetime
from langchain_core.tools import InjectedToolArg, tool
from langchain_core.messages import HumanMessage, SystemMessage
from typing_extensions import Annotated, TypedDict

from models import gpt4 as llm
import prompts
import responses
import db_functions as _db
import utils
from detect_problem import problem_detector

#url = os.environ["HASS_URL"]
#key = os.environ["HASS_API_KEY"]


class Command(TypedDict):
    endpoint: str
    body: dict

@tool()
def do_instant_actions(
    commands: Annotated[List[Command], "List of commands where each command is a dictionary with 'endpoint' as a string and 'body' as a dictionary (or JSON string that will be loaded)."],
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
    """
    Perform instant actions in Home Assistant.
    
    Args:
        commands: List of commands where each command is a dictionary with:
            - endpoint: The API endpoint to call (e.g., "/api/services/light/turn_on")
            - body: A dictionary containing the request body parameters. If provided as a JSON string, it will be loaded.
    """
    try:
        auth = _db.get_credentials(user_id)
        utils.update_chat_state(action="add-state", state="Eseguo azioni", session_id=session_id, user_id=user_id, id='do-instant-action')
        headers = {'Content-Type': 'application/json', 'Authorization': f"Bearer {auth['key']}"}
        responses = []
        for item in commands:
            endpoint = auth['url'] + item['endpoint']
            body = item['body'] if isinstance(item['body'], dict) else json.loads(item['body'])
            response = requests.post(endpoint, json=body, headers=headers)
            responses.append({
                'action': body,
                'status_code': response.status_code,
                'response_text': response.text
            })
        content = f"Action executed with the following responses: {responses}"
        utils.update_chat_state(action="confirm-state", state="Azioni eseguite con successo", session_id=session_id, user_id=user_id, id='do-instant-action')
        return content
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante l'esecuzione delle azioni", session_id=session_id, user_id=user_id, id='do-instant-action')
        return f"Errore durante l'esecuzione delle azioni: {e}"


@tool()
def generate_automation(
    description: Annotated[str, "The automation description in the format: Event: <event> (<entity_id>) Condition: <condition> (<entity_id>) AND <condition> (<entity_id>) OR ... Action: <actions> (<entity_ids>)."],
    automation_id: Annotated[str, "The ID of the automation to generate. Use '0' to generate a new automation, or the ID of an existing automation to update it."],
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
    """
    Generate the automation requested by the user.
    Take as input a detailed description of the automation and the entity_ids to be used.
    """
    utils.update_chat_state(action="add-state", state="Genero l'automazione", session_id=session_id, user_id=user_id, id='generate-automation')
    formatted_prompt = prompts.automation_generator.format(
        home_devices=_db.get_devices(user_id),
        time_date= datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    messages = [
    SystemMessage(formatted_prompt),
    HumanMessage(description),
    ]
    structured_response = llm.with_structured_output(responses.GenerateAutomationResponse)
    data = structured_response.invoke(messages)
    try:
        if automation_id == '0':
            automations = _db.get_automations(user_id)
            automation_id = '1' if len(automations) == 0 else str(int(automations[-1]['id']) + 1)
            data['automation']['id'] = automation_id
        else:
            data['automation']['id'] = automation_id
        
        response = utils.save_automation(user_id, session_id, data['automation'], automation_id )
        
        if response:
            problems = problem_detector(user_id, session_id, automation_id)
            utils.update_chat_state(action="confirm-state", state="Automazione generata e salvata con successo", session_id=session_id, user_id=user_id, id='generate-automation')
            utils.update_chat_state(action="update-automation-list", state="", session_id=session_id, user_id=user_id)
            return f"Automation Info: {response.json()}. ID assegnato: {automation_id}. \nProblems info: {problems}"
        else:
            utils.update_chat_state(action="error-state", state="Errore durante la generazione dell'automazione", session_id=session_id, user_id=user_id, id='generate-automation')
            return f"Errore durante la generazione dell'automazione: {response.json()}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante la generazione dell'automazione", session_id=session_id, user_id=user_id, id='generate-automation')
        return f"Errore durante la generazione dell'automazione: {e}"


@tool()
def get_automation_list(
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
    """
    Get the list of all the automations in the system.
    Only return the IDs, aliases and descriptions of the automations.
    This function should be used to search among the automations when the user cannot remember or identify the ID of the automation.
    """
    try:
        utils.update_chat_state(action="add-state", state="Recupero la lista delle automazioni", session_id=session_id, user_id=user_id, id='get-automation-list')
        automations = _db.get_automations(user_id)
        formatted_automations = []
        for automation in automations:
            formatted_automations.append(f"ID: {automation['id']} - {automation['config']['alias']} - {automation['config']['description']}")
        utils.update_chat_state(action="confirm-state", state="Lista delle automazioni recuperata con successo", session_id=session_id, user_id=user_id, id='get-automation-list')
        return "Ecco la lista delle automazioni salvate:\n" + "\n".join(formatted_automations)
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il recupero della lista delle automazioni", session_id=session_id, user_id=user_id, id='get-automation-list')
        return f"Errore durante il recupero della lista delle automazioni: {e}"

@tool()
def get_automation(
    automation_id: Annotated[str, "The ID of the automation to retrieve."],
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
    """
    Get the a specific automation for the user.
    This function need the ID of the automation to retrieve.
    This function should be used to retrieve the full configuration of an automation (e.g., to edit or explain it)
    """
    try:
        utils.update_chat_state(action="add-state", state="Recupero l'automazione", session_id=session_id, user_id=user_id, id='get-automation')
        automation = _db.get_automation(user_id, automation_id)
        utils.update_chat_state(action="confirm-state", state="Automazione recuperata con successo", session_id=session_id, user_id=user_id, id='get-automation')
        return f"{automation}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il recupero dell'automazione", session_id=session_id, user_id=user_id, id='get-automation')
        return f"Errore durante il recupero dell'automazione: {e}"

@tool()
def get_problem(
    problem_id: Annotated[str | None, "The ID of the problem to retrieve"],
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
    """
    Get the a specific problem for the user.
    This function need the ID of the problem to retrieve. If no ID is provided, it will retrieve all the problems.
    This function should be used to retrieve the full configuration of a problem (e.g., to get the details and possible solutions)
    """
    try:
        utils.update_chat_state(action="add-state", state="Recupero il problema", session_id=session_id, user_id=user_id, id='get-problem')
        problem = _db.get_problem(user_id, problem_id)
        utils.update_chat_state(action="confirm-state", state="Problema recuperato con successo", session_id=session_id, user_id=user_id, id='get-problem')
        return f"{problem}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il recupero del problema", session_id=session_id, user_id=user_id, id='get-problem')
        return f"Errore durante il recupero del problema: {e}"



@tool()
def get_entity_log(
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg],
    entity_id: Annotated[list[str], "The ID or IDs of the entity(ies) to retrieve the log for."],
    period: Annotated[int, "The period to retrieve the log for in hours. Minimum 1 hour, maximum 24 hours."] = 2,
) -> str:
    """
    Get the log of the specified entity(ies) for the given period (optional, default 2 hours).
    """
    try:
        utils.update_chat_state(action="add-state", state="Recupero i log...", session_id=session_id, user_id=user_id, id='get-entity-log')
        credentials = _db.get_credentials(user_id)
        if not credentials:
            utils.update_chat_state(action="error-state", state="Credenziali non trovate", session_id=session_id, user_id=user_id, id='get-entity-log')
            return "Credenziali non trovate. Assicurati di aver configurato correttamente il tuo account."
        url = credentials['url']
        key = credentials['key']
        now = (datetime.datetime.now() - datetime.timedelta(hours=period)).strftime("%Y-%m-%dT%H:%M:%S+02:00")
        formatted_period = requests.utils.quote(now)
        formatted_now = requests.utils.quote(now)
        response = requests.get(
            f"{url}/api/history/period/{formatted_period}?end_time={formatted_now}&filter_entity_id={','.join(entity_id)}&minimal_response&no_attributes",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        )
        if response.status_code != 200:
            utils.update_chat_state(action="error-state", state="Errore durante il recupero del log", session_id=session_id, user_id=user_id, id='get-entity-log')
            return f"Errore durante il recupero del log: {response.status_code} - {response.text}"
        logs = response.json()
        if not logs:
            utils.update_chat_state(action="confirm-state", state="Nessun log trovato per l'entità specificata", session_id=session_id, user_id=user_id, id='get-entity-log')
            return "Nessun log trovato per l'entità specificata."
        utils.update_chat_state(action="confirm-state", state="Log recuperati con successo", session_id=session_id, user_id=user_id, id='get-entity-log')
        return f"{logs}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il recupero del log", session_id=session_id, user_id=user_id, id='get-entity-log')
        return f"Errore durante il recupero del log: {e}"







#### Deprecated functions
"""
@tool()
def conflict_check(
    automation_id: Annotated[str, "The ID of the automation to check"],
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
    
    #Check if the automation has any conflicts or activation chains with other automations.
    #This is a mandatory step before saving the automation.
    
    try:
        utils.update_chat_state(action="add-state", state="Controllo conflitti e catene", session_id=session_id, user_id=user_id, id='conflict-check')
        data = _db.get_tmp_data(user_id)
        if data is None:
            #nessuna tmp_data salvata, dovrebbe significare che non c'è nessuna automazione under construction
            #quindi verifico se l'utente sta provando a controllare un automazione già esistente
            automation = _db.get_automation(user_id, automation_id)
            if automation is None:
                utils.update_chat_state(action="error-state", state="Non ho trovato l'automazione da controllare", session_id=session_id, user_id=user_id, id='conflict-check')
                return f"The automation with ID {automation_id} do not exist."
            else:
                #!TODO: logica di controllo conflitti per automazioni già esistenti
                checks = {'conflict': 'Done', 'energy': 'To do'} #!!!BUG? puo essere incosistente se l'utente ha gia fatto un check energetico
                _db.save_tmp_data(user_id, {'automation': automation, 'checks':checks }) #sostituisco i dati temporanei, se esistenti
                utils.update_chat_state(action="confirm-state", state="Nessun problema trovato", session_id=session_id, user_id=user_id, id='conflict-check')
                return f"No conflicts detected. Eventual remaining checks: {checks}."
        else:
            #ho trovato una tmp_data, quindi sono in fase di generazione di una nuova automazione
            #!TODO: logica di controllo conflitti per automazioni in fase di generazione
            detector = ConflictDetector(url, key, user_id)
            conflicts = detector.detect_appliances_conflicts(data['automation'])
            if len(conflicts) > 0:
                utils.update_chat_state(action="confirm-state", state="Ho trovato dei problemi da risolvere", session_id=session_id, user_id=user_id, id='conflict-check')
                utils.update_chat_state(action="generate-conflict-card", state = conflicts, session_id=session_id, user_id=user_id, id='problem-card')
                return f"Conflicts detected: {conflicts}. Eventual remaining checks after conflict resolution: {data['checks']}\n These information are shown in a problem card in the left part of the interface, only say to the user to check it."
            else:
                utils.update_chat_state(action="confirm-state", state="Nessun problema trovato", session_id=session_id, user_id=user_id, id='conflict-check')
            data['checks']['conflict'] = 'Done'
            _db.save_tmp_data(user_id, data) #sostituisco i dati temporanei, se esistenti
            return f"No conflicts detected. Eventual remaining checks: {data['checks']}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il controllo dei conflitti", session_id=session_id, user_id=user_id, id='conflict-check')
        return f"Error during the execution of conflict detection: {e}"

@tool()
def energy_check(
    automation_id: Annotated[str, "The ID of the automation to check"],
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
   
    #Check if the automation has any energy consumption issues.
    #This is a mandatory step before saving the automation.
  
    try:
        utils.update_chat_state(action="add-state", state="Controllo problemi energetici", session_id=session_id, user_id=user_id, id='energy-check')
        data = _db.get_tmp_data(user_id)
        if data is None:
            #nessuna tmp_data salvata, dovrebbe significare che non c'è nessuna automazione under construction
            #quindi verifico se l'utente sta provando a controllare un automazione già esistente
            automation = _db.get_automation(user_id, automation_id)
            if automation is None:
                utils.update_chat_state(action="error-state", state="Non ho trovato l'automazione da controllare", session_id=session_id, user_id=user_id, id='energy-check')
                return f"L'automazione con ID {automation_id} non è presente nel sistema."
            else:
                #!TODO: logica di controllo conflitti energetici per automazioni già esistenti
                checks = {'conflict': 'Done', 'energy': 'Done'}
                _db.save_tmp_data(user_id, {'automation': automation, 'checks':checks }) #sostituisco i dati temporanei, se esistenti
                utils.update_chat_state(action="confirm-state", state="Nessun problema trovato", session_id=session_id, user_id=user_id, id='energy-check')
                return "Nessun problema energetico trovato"
        else:
            #ho trovato una tmp_data, quindi sono in fase di generazione di una nuova automazione
            #!TODO: logica di controllo conflitti per automazioni in fase di generazione
            data['checks']['energy'] = 'Done'
            _db.save_tmp_data(user_id, data) #sostituisco i dati temporanei, se esistenti
            utils.update_chat_state(action="confirm-state", state="Nessun problema trovato", session_id=session_id, user_id=user_id, id='energy-check')
            return f"Nessun problema energetico trovato. Eventuali check rimasti: {data['checks']}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il controllo dei problemi energetici", session_id=session_id, user_id=user_id, id='energy-check')
        return f"Errore durante il controllo dei conflitti: {e}"
    
@tool()
def save_automation(
    user_id: Annotated[str, InjectedToolArg],
    session_id: Annotated[str, InjectedToolArg]
) -> str:
  
    #Save the automation in the database.
    #This function should be called after the checks are done and the automation is ready to be saved.

    try:
        utils.update_chat_state(action="add-state", state="Salvo l'automazione", session_id=session_id, user_id=user_id, id='save-automation')
        data = _db.get_tmp_data(user_id)
        if data is None:
            utils.update_chat_state(action="error-state", state="Nessuna automazione da salvare", session_id=session_id, user_id=user_id, id='save-automation')
            return "Nessuna automazione da salvare."
        else:
            response = utils.save_automation(user_id, session_id, data['automation'], data['automation']['id'])
        if response.status_code == 200:
            _db.remove_tmp_data(user_id) #rimuovo i dati temporanei
            utils.update_chat_state(action="confirm-state", state="Automazione generata e salvata con successo", session_id=session_id, user_id=user_id, id='save-automation')
            utils.update_chat_state(action="update-automation-list", state="", session_id=session_id, user_id=user_id)
            return f"L'automazione è stata salvata con successo. {response.json()}"
        else:
            utils.update_chat_state(action="error-state", state="Errore durante il salvataggio dell'automazione", session_id=session_id, user_id=user_id, id='save-automation')
            return f"Errore durante salvataggio dell'automazione: {response}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il salvataggio dell'automazione", session_id=session_id, user_id=user_id, id='save-automation')
        return f"Errore durante il salvataggio dell'automazione: {e}"


"""