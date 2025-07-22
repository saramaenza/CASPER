import prompts
import sys # Added for testing
import os # Added for testing
# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Fix import based on execution context

import db_functions as _db

def call_find_solution_llm(user_id: str):
    """Generate solution for conflicts using LLM"""
    formatted_prompt = prompts.recommender.format(
        home_devices=_db.get_devices(user_id),
        ranking_goals=_db.get_ranking_goals(user_id),
        automations= _db.get_automations(user_id)   #solo la descrizione dell'automazione
    )
    messages = [
        SystemMessage(formatted_prompt),
        HumanMessage(f"Generate a solution for the issue between the user goal: {user_goal} and the following automation: {automation_description} because it activates the fuzzy rule: {fuzzy_rule_activated}. Provide a solution that is clear and actionable, considering the user's goal and the automation's function."),
    ]
    structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
    data = structured_response.invoke(messages)
    return data