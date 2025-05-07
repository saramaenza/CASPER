from typing import List, Tuple, Any
import requests
import json
import os
from datetime import datetime
from langchain_core.tools import InjectedToolArg, tool
from langchain_core.messages import HumanMessage, SystemMessage
from typing_extensions import Annotated, TypedDict
from pydantic import BaseModel, Field

from models import gpt4
import prompts
import responses
import db_functions as _db
import utils


url = os.environ["HASS_URL"]
key = os.environ["HASS_API_KEY"]

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
        utils.update_chat_state(action="add-state", state="Eseguo azioni", session_id=session_id, user_id=user_id, id='do-instant-action')
        headers = {'Content-Type': 'application/json', 'Authorization': f"Bearer {key}"}
        responses = []
        for item in commands:
            endpoint = url + item['endpoint']
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
    utils.update_chat_state(action="add-state", state="Genero e salvo l'automazione", session_id=session_id, user_id=user_id, id='generate-automation')
    formatted_prompt = prompts.automation_generator.format(
        home_devices=_db.get_devices(user_id),
        time_date= datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    messages = [
    SystemMessage(formatted_prompt),
    HumanMessage(description),
    ]
    structured_gpt4 = gpt4.with_structured_output(responses.GenerateAutomationResponse)
    data = structured_gpt4.invoke(messages)
    try:
        if automation_id == '0':
            automations = _db.get_automations(user_id)
            automation_id = '1' if len(automations) == 0 else str(int(automations[-1]['id']) + 1)
            data['automation']['id'] = automation_id
        else:
            data['automation']['id'] = automation_id
        response = utils.save_automation(user_id, session_id, data['automation'], automation_id )
        if response.status_code == 200:
            utils.update_chat_state(action="confirm-state", state="Automazione generata e salvata con successo", session_id=session_id, user_id=user_id, id='generate-automation')
            utils.update_chat_state(action="update-automation-list", state="", session_id=session_id, user_id=user_id)
            return f"L'automazione è stata salvata con successo. {response.json()}"
        else:
            utils.update_chat_state(action="error-state", state="Errore durante il salvataggio dell'automazione", session_id=session_id, user_id=user_id, id='generate-automation')
            return f"Errore durante salvataggio dell'automazione: {response}"
    except Exception as e:
        utils.update_chat_state(action="error-state", state="Errore durante il salvataggio dell'automazione", session_id=session_id, user_id=user_id, id='generate-automation')
        return f"Errore durante generazione e salvataggio dell'automazione: {e}"

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
