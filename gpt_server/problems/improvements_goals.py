import sys # Added for testing
import os # Added for testing
# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Fix import based on execution context
from langchain_core.messages import HumanMessage, SystemMessage
import prompts
import models
import responses

llm = models.gpt4

import db_functions as _db

def call_find_solution_llm(user_id: str):
    """Generate improvements based on users ranking goal"""
    formatted_prompt = prompts.improvements_goal_based.format(
        home_devices=_db.get_devices(user_id),
        ranking_goals=_db.get_ranking_goals(user_id),
        automations= _db.get_automations(user_id)  
    )

    messages = [
        SystemMessage(formatted_prompt),
        HumanMessage(f"Generate automations to improve the user's goals based on their personal preference ranking. Provide clear and actionable alternatives, taking into account the user's goal."),
    ]
    structured_response = llm.with_structured_output(responses.GenerateRecommendationResponse)
    data = structured_response.invoke(messages)
    return data

def save_solutions_to_db(user_id: str, solutions):
    """Salva le soluzioni generate nel database."""
    _db.insert_improvement_solution(user_id, solutions)

def generate_and_store_solutions(user_id: str):
    """Genera le soluzioni e le salva nel database."""
    solutions = call_find_solution_llm(user_id)
    save_solutions_to_db(user_id, solutions)
    return solutions

if __name__ == "__main__":
    import os
    
    user_id = '681dc95bd86883dcc0eeebad'
    suggestions = generate_and_store_solutions(user_id)

    print("Suggestions: ", suggestions)