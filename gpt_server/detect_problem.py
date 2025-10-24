import os
import time
import db_functions as _db
from problems.revert_problem import detectRevertProblem
from marshmallow import pprint
import utils
from problems.conflicts import ConflictDetector
from problems.chains import ChainsDetector
from problems.goal_advisor import detectGoalAdvisor
from ha_client import HomeAssistantClient

#url = os.environ["HASS_URL"]
#key = os.environ["HASS_API_KEY"]


def problem_detector(user_id, session_id, automation):
    """
    Detects promblems using the ConflictDetector and ChainDetector classes.
    """
    try:
        auth = _db.get_credentials(user_id)
        ha_client = HomeAssistantClient(auth['url'], auth['key'])
        #start = time.time()
        data = _db.get_automations(user_id)
        if automation != "all_rules":
            automation = _db.get_automation(user_id, automation)
        if not data:
            print("No automations found for user in Detect problem:", user_id)
            return "Error: Automation not found."
        chain_detector = ChainsDetector(ha_client, user_id)
        conflict_detector = ConflictDetector(ha_client, user_id)
        
        direct_chains = chain_detector.detect_chains(data, automation, "direct")
        indirect_chains = chain_detector.detect_chains(data, automation, "indirect") 
        conflicts = conflict_detector.detect_conflicts(data, automation)

        goals =  ["energy", "security"]
        all_revert_problems = []
        for goal in goals:
            revert_problem = []
            revert_problem = detectRevertProblem(automation, goal, user_id, ha_client)
            if revert_problem is not None and len(revert_problem) > 0:
                _db.post_goal(user_id, goal, revert_problem)
                all_revert_problems.extend(revert_problem)
        all_problems = direct_chains + indirect_chains + conflicts

        #end = time.time()
        #print(f"Problem detection took {end - start} seconds")
        if not all_problems and not all_revert_problems:
            return "No problems detected."
        try:
            problems_w_id = _db.post_problem(user_id, all_problems)
        except Exception as e:
            print(f"Error while saving main problems: {e}")
            problems_w_id = []

        filtered_problems = [problems for problems in problems_w_id if problems.get('state', 'on') == "on"]

        response_message = []

        if not problems_w_id:
            response_message.append(f"Detected {len(filtered_problems)} problems but Error: Unable to save detected problems to DB.")
        else:
            problems_id = [problem['id'] for problem in filtered_problems]
            response_message.append(f"Detected {len(filtered_problems)} problems (problems ids: {problems_id}). Problem cards with details are available for the user in the interface under the Problems section.")

        # Gestione dei problemi di tipo "revert"
        if all_revert_problems:
            try:
                revert_problems_ids = [problem['id'] for problem in all_revert_problems]
                response_message.append(f"Detected {len(all_revert_problems)} missing turn-off problems (problems ids: {revert_problems_ids}). Problem with details are available for the user in the interface under the Suggestions section.")
            except Exception as e:
                print(f"Error while processing revert problems: {e}")

        if not response_message:
            return "No problems detected."

        final_message = "\n".join(response_message)
        return final_message

    except Exception as e:
        return f"Error: {e}"
    
def detect_goal_advisor(user_id):
    """
    Detects goal advisor based on the automation configuration and the specified goal.
    """
    try:
        #user_id = '6818c8ac24e5db8f9a0304e5'
        auth = _db.get_credentials(user_id)
        ha_client = HomeAssistantClient(auth['url'], auth['key'])
        
        #automations = _db.get_automations_states(user_id)
        #goals = ["security", "well-being", "energy", "health"]
        goals = ["energy"] #per test utente
        automations = ["automazione"] #per test utente
        for automation in automations:
            #automation_config = _db.get_automation(user_id, automation['id'])
            automation_config = _db.get_automation(user_id, "12") #per test utente
            for goal in goals:
                goal_advisor = detectGoalAdvisor(automation_config, goal, user_id, ha_client)
                if goal_advisor is not None and len(goal_advisor) > 0:
                    #print(f"Goal advisor detected for user {user_id} with goal {goal}: {goal_advisor}")
                    _db.post_goal(user_id, goal, goal_advisor)
    
    except Exception as e:
        print(f"Error in detectGoalAdvisor: {e}")
        return None