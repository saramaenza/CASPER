from dotenv import load_dotenv
from datetime import datetime
load_dotenv()
from typing import Annotated
from typing_extensions import TypedDict
from langchain_core.messages import HumanMessage, SystemMessage

from flask import Flask, request, jsonify

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import trim_messages
from problems.goal_scores import get_quality_scores_only
from problems.improvements_goals import get_goal_improvements, replace_ignored_suggestion_with_new
from detect_problem import problem_detector, detect_goal_advisor
from config import get_server_choice
import tools as _tools
import utils
import prompts
import db_functions as _db
from models import gpt4

from detect_problem import detect_goal_advisor
import threading
import time

data = get_server_choice()
utils.set_base_url(data['base_url'], data['port'])
_db.set_db(data['db_name'])

memory = MemorySaver()
llm = gpt4
tools = [_tools.do_instant_actions, _tools.generate_automation, _tools.get_automation, _tools.get_automation_list, _tools.get_problem, _tools.get_entity_log] #_tools.conflict_check, _tools.energy_check, _tools.save_automation
llm_tools = llm.bind_tools(tools)
#Imposto il trimmer con "token_counter=len" per contare i mesaggi come se fossero token
trimmer = trim_messages(strategy="last", max_tokens=10, token_counter = len, include_system=True, start_on="human")
app = Flask(__name__)

# Flag per controllare il thread in background
stop_background_tasks = False

def background_goal_advisor():
    """
    Funzione che esegue detectGoalAdvisor ogni 10 minuti per tutti gli utenti attivi
    """
    while not stop_background_tasks:
        try:
            #print(f"[{datetime.now()}] Running background goal advisor detection...")
            
            # Ottieni tutti gli utenti attivi 
            users = _db.get_active_users()  

            #users = [{'id': '6818c8ac24e5db8f9a0304e5'}]  # Esempio di utenti
            for user in users:
                user_id = user.get('id') or user.get('_id')
                if user_id:
                    detect_goal_advisor(user_id)
                    print(f"Goal advisor detection completed for user: {user_id}")

            #print(f"[{datetime.now()}] Background goal advisor detection completed")

        except Exception as e:
            print(f"Error in background goal advisor: {e}")
        
        # Aspetta 10 minuti (600 secondi)
        time.sleep(600)

def sanitize_description_with_llm(description):
    try:
        formatted_prompt = prompts.sanitize_description.format(description=description)

        messages = [
            SystemMessage(formatted_prompt),
            HumanMessage(f"Sanitize the following automation description: '{description}'."),
        ]

        # Chiamata a LLM
        response = llm.invoke(messages)
        return response.content  # Assicurati di restituire il contenuto corretto
    except Exception as e:
        print(f"Error during LLM invocation: {e}")
        raise

class State(TypedDict):
    # Messages have the type "list". The `add_messages` function
    # in the annotation defines how this state key should be updated
    # (in this case, it appends messages to the list, rather than overwriting them)
    messages: Annotated[list, add_messages]

graph_builder = StateGraph(State)

sys_template = ChatPromptTemplate([
    ("system", prompts.casper)
])

def chatbot(state: State, config: dict):
    formatted_prompt = sys_template.invoke({
        "user_name": _db.get_user_name(config["configurable"]["user_id"]),
        "home_devices": _db.get_devices(config["configurable"]["user_id"]),
        "time_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    messages = state["messages"]
    if not any(getattr(msg, "role", None) == "system" for msg in messages):
        messages = formatted_prompt.to_messages() + messages

    messages = trimmer.invoke(messages)
    llm_response = llm_tools.invoke(messages)
    if hasattr(llm_response, "tool_calls"):
        tool_calls = utils.inject_user_id(llm_response, config["configurable"]["user_id"], config["configurable"]["thread_id"])
        llm_response.tool_calls = tool_calls
    _db.update_state(config["configurable"]["user_id"], config["configurable"]["thread_id"], state["messages"])
    return {"messages": [llm_response]}

graph_builder.add_node("chatbot", chatbot)

tool_node = ToolNode(tools)

graph_builder.add_node("tools", tool_node)

graph_builder.add_conditional_edges(
    "chatbot",
    tools_condition,
)
# Any time a tool is called, we return to the chatbot to decide the next step
graph_builder.add_edge("tools", "chatbot")
graph_builder.add_edge(START, "chatbot")

graph = graph_builder.compile(checkpointer=memory)


@app.route('/send_message', methods=['POST'])
def send_message():
    try:
        data = request.json
        user_input = data.get('text')
        user_id = data.get('user_id')
        thread_id = data.get('session')

        if not user_input:
            return jsonify({'error': 'No message provided'}), 400

        config = {
            "configurable": {
                "thread_id": thread_id,
                "user_id": user_id
            }
        }
        response = graph.invoke(
            {"messages": [{"role": "user", "content": user_input}]},
            config
        )

        last_message = response["messages"][-1]
        _db.update_state(user_id, thread_id,response["messages"])
        return jsonify({'text': last_message.content, 'tokens': '0'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/sanitize_description', methods=['POST'])
def sanitize_description():
    data = request.json
    description = data.get('description')
    if not description:
        return jsonify({'error': 'Missing description'}), 400
    try:
        sanitized = sanitize_description_with_llm(description)
        return jsonify({'sanitized_description': sanitized}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get_quality_scores', methods=['POST'])
def get_quality_scores():
    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    try:
        scores = get_quality_scores_only(user_id)
        return jsonify({'quality_scores': scores}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/get_goal_improvements', methods=['POST'])
def get_goal_improvements_route():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400
    try:
        solutions = get_goal_improvements(user_id)
        return jsonify(solutions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/detect_goal_advisor', methods=['POST'])
def api_detect_goal_advisor():
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({'error': 'Missing user_id'}), 400
        # Chiama la funzione detect_goal_advisor
        result = detect_goal_advisor(user_id)
        return jsonify({'status': 'success', 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect_problem', methods=['POST'])
def detect_problem_endpoint():
    try:
        data = request.json
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        automations = data.get('automations')

        if not user_id or not automations:
            print("Error: Missing required parameters")
            return jsonify({'error': 'Missing required parameters'}), 400
        result = problem_detector(user_id, session_id, automations)
        return jsonify({'result': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/generate_replacement_suggestion', methods=['POST'])
def generate_replacement_suggestion():
    data = request.json
    user_id = data.get('user_id')
    goal = data.get('goal')
    
    if not user_id or not goal:
        return jsonify({'error': 'Missing user_id or goal'}), 400
    
    try:
        new_suggestion = replace_ignored_suggestion_with_new(user_id, goal)
        if new_suggestion:
            return jsonify({'success': True, 'suggestion': new_suggestion}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to generate suggestion'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Avvia il thread in background
    background_thread = threading.Thread(target=background_goal_advisor, daemon=True)
    background_thread.start()
    app.run(debug=True, port=8080, use_reloader=False)


"""
def stream_graph_updates(user_input: str, config: dict):
    # The config is the **second positional argument** to stream() or invoke()!
    events = graph.stream(
        {"messages": [{"role": "user", "content": user_input}]},
        config,
        stream_mode="messages",
    )
    for event in events:
        token = getattr(event[0], "content", None)
        #event["messages"][-1].pretty_print() #For stram_mode="values"
        if token:
            print(token, end='', flush=True)
    print()

# To run in the terminal
while True:
    try:
        user_id = '123'
        config = {"configurable": {
            "session_id": "9",
            "user_id": user_id
            }}
        
        user_input = input("User: ")
        if user_input.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break

        stream_graph_updates(user_input, config)
    except:
        # fallback if input() is not available
        user_input = "What do you know about LangGraph?"
        print("User: " + user_input)
        stream_graph_updates(user_input, config)
        break"
"""