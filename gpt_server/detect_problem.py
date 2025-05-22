import os
import time
import db_functions as _db
import utils
from problems.conflicts import ConflictDetector
from problems.chains import ChainsDetector
from ha_client import HomeAssistantClient

url = os.environ["HASS_URL"]
key = os.environ["HASS_API_KEY"]
ha_client = HomeAssistantClient(url, key)

def problem_detector(user_id, session_id, automation_id):
    """
    Detects promblems using the ConflictDetector and ChainDetector classes.
    """
    try:
        start = time.time()
        data = _db.get_automation(user_id, automation_id)
        if not data:
            return "Error: Automation not found."
        conflict_detector = ConflictDetector(ha_client, _db, user_id)
        chain_detector = ChainsDetector(ha_client, _db, user_id)

        direct_chains = chain_detector.detect_chains(data, "direct")
        indirect_chains = chain_detector.detect_chains(data, "indirect")
        conflicts = conflict_detector.detect_appliances_conflicts(data)

        all_problems = direct_chains + indirect_chains + conflicts
        end = time.time()
        print(f"Problem detection took {end - start} seconds")
        if not all_problems:
            return "No problems detected."
        problems_w_id = _db.post_problem(user_id, all_problems)
        if not problems_w_id:
            return "Error: Unable to save detected problems."
        else:
            utils.update_chat_state("update-problems", "", session_id, user_id, "")
            return f"Detected {len(problems_w_id)+1}. Problem cards with details are available in the user interface under the Problems section."
       
    except Exception as e:
        return f"Error: {e}"