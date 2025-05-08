from dotenv import load_dotenv
from datetime import datetime
load_dotenv()
from typing import Annotated
from typing_extensions import TypedDict

from flask import Flask, request, jsonify

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.prompts import ChatPromptTemplate

from config import get_server_choice
import tools as _tools
import utils
import prompts
import db_functions as _db
from models import gpt4

data = get_server_choice()
utils.set_base_url(data['base_url'], data['port'])
_db.set_db(data['db_name'])

memory = MemorySaver()
llm = gpt4
tools = [_tools.do_instant_actions, _tools.generate_automation, _tools.get_automation, _tools.get_automation_list, _tools.conflict_check, _tools.energy_check, _tools.save_automation]
llm_tools = llm.bind_tools(tools)
app = Flask(__name__)

class State(TypedDict):
    # Messages have the type "list". The `add_messages` function
    # in the annotation defines how this state key should be updated
    # (in this case, it appends messages to the list, rather than overwriting them)
    messages: Annotated[list, add_messages]

graph_builder = StateGraph(State)

prompt_template = ChatPromptTemplate([
    ("system", prompts.rulebot)
])

def chatbot(state: State, config: dict):
    formatted_prompt = prompt_template.invoke({
        "user_name": _db.get_user_name(config["configurable"]["user_id"]),
        "home_devices": _db.get_devices(config["configurable"]["user_id"]),
        "time_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    messages = state["messages"]
    if not any(getattr(msg, "role", None) == "system" for msg in messages):
        messages = formatted_prompt.to_messages() + messages

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

if __name__ == '__main__':
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