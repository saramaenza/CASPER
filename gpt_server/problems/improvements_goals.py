import sys # Added for testing
import os # Added for testing
# Add parent directory (gpt_server) to sys.path for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Fix import based on execution context
from langchain_core.messages import HumanMessage, SystemMessage
import prompts
import models
from bson.objectid import ObjectId
import responses

llm = models.gpt4

import db_functions as _db

def call_find_solution_llm(user_id: str):
    """Generate improvements based on users ranking goal"""
    formatted_prompt = prompts.improvements_goal_based.format(
        home_devices=_db.get_devices(user_id),
        ranking_goals=_db.get_ranking_goals(user_id),
        automations= _db.get_automations(user_id),
        ignored_automations=_db.get_ignored_suggestions(user_id)
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

def get_goal_improvements(user_id: str):
    """Genera le soluzioni e le salva nel database se non esistono problemi con goal"""
    userProblems = _db.get_problems_goals(user_id)
    # Verifica se userProblems è vuoto o non contiene i campi richiesti
    required_goals = ["energy", "security", "safety", "well-being"]
    if (not userProblems or len(userProblems) == 0 or not any(goal in userProblems for goal in required_goals)):
        solutions = call_find_solution_llm(user_id)
        save_solutions_to_db(user_id, solutions)
        return solutions
    return []

def generate_single_suggestion(user_id: str, goal: str):
    """Generate a single suggestion for a specific goal"""
    ignored_automations_for_goal = _db.get_ignored_suggestions(user_id).get(goal.lower(), [])
    
    formatted_prompt = prompts.single_goal_suggestion.format(
        home_devices=_db.get_devices(user_id),
        goal=goal,
        automations=_db.get_automations(user_id),
        ignored_automations_for_goal=ignored_automations_for_goal,
        unique_id=str(ObjectId())
    )

    messages = [
        SystemMessage(formatted_prompt),
        HumanMessage(f"Generate a single automation suggestion to improve the '{goal}' goal. Make sure it's different from existing and ignored automations."),
    ]
    
    response = llm.invoke(messages)
    
    # Parse the response as JSON
    import json
    try:
        suggestion_data = json.loads(response.content)
        return suggestion_data
    except json.JSONDecodeError:
        return None

def replace_ignored_suggestion_with_new(user_id: str, goal: str):
    """Replace an ignored suggestion with a new one"""
    new_suggestion = generate_single_suggestion(user_id, goal)
    if new_suggestion:
        _db.add_single_suggestion_to_solutions(user_id, goal, new_suggestion)
    return new_suggestion

if __name__ == "__main__":
    import os
    
    user_id = '681dc95bd86883dcc0eeebad'
    suggestions = get_goal_improvements(user_id)

    print("Suggestions: ", suggestions)