import os
from marshmallow import pprint
import time
import db_functions as _db
from problems.goal_advisor import detectGoalAdvisor
import utils
from problems.conflicts import ConflictDetector
from problems.chains import ChainsDetector
from ha_client import HomeAssistantClient

#url = os.environ["HASS_URL"]
#key = os.environ["HASS_API_KEY"]


def problem_detector(user_id, session_id, automation_id):
    """
    Detects promblems using the ConflictDetector and ChainDetector classes.
    """
    try:
        auth = _db.get_credentials(user_id)
        ha_client = HomeAssistantClient(auth['url'], auth['key'])
        #start = time.time()
        data = _db.get_automations(user_id)
        new_automation = _db.get_automation(user_id, automation_id)
        if not data:
            return "Error: Automation not found."

        chain_detector = ChainsDetector(ha_client, user_id)
        conflict_detector = ConflictDetector(ha_client, user_id)
        
        #direct_chains = chain_detector.detect_chains(data, new_automation, "direct")
        #indirect_chains = chain_detector.detect_chains(data, new_automation, "indirect")
        #conflicts = conflict_detector.detect_conflicts(data, new_automation)
        all_goals = {}
        goals =  ["security", "well-being", "energy saving", "health"]
        for goal in goals:
            goal_advisor = detectGoalAdvisor(new_automation, goal, user_id)
            all_goals[goal] = goal_advisor
        pprint("All goals detected:")
        pprint(all_goals)
        #all_problems = direct_chains + indirect_chains + conflicts
        all_problems = None
        #end = time.time()
        #print(f"Problem detection took {end - start} seconds")
        if not all_problems:
            return "No problems detected."
        problems_w_id = _db.post_problem(user_id, all_problems)
        if not problems_w_id:
            return f"Detected {len(problems_w_id)} problems but Error: Unable to save detected problems to DB."
        else:
            problems_id = [problem['id'] for problem in problems_w_id]
            return f"Detected {len(problems_w_id)} problems (problems ids: {problems_id}). Problem cards with details are available for the user in the interface under the Problems section."
       
    except Exception as e:
        return f"Error: {e}"