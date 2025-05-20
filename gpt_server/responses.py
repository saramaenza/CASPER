from typing import Optional, List, Dict
from typing_extensions import Annotated, TypedDict


class GenerateAutomationResponse(TypedDict):
  """Define the response format for the generate_automation tool."""
  automation: Annotated[Dict, "The generated automation JSON."]
  #structured_description: Annotated[str, "The detailed structured description of the generated automation."]
  message: Annotated[Optional[str], "", "A message for the user."]

# Definizioni per lo schema JSON delle raccomandazioni
class Alternative(TypedDict):
    """Represents a single alternative with both structured and natural language forms."""
    structured: Annotated[str, "The structured representation of the alternative."]
    natural_language: Annotated[str, "The natural language description of the alternative."]

class AutomationRecommendationEntry(TypedDict):
    """Represents the set of alternatives for a single automation ID"""
    alternatives: Annotated[List[Alternative], "A list of alternative suggestions for the automation."]

class GenerateRecommendationResponse(TypedDict):
    """Defines the response format for the generate_recommendation tool."""
    description: Annotated[str, "A description of the conflict between the automations."]
    recommendations: Annotated[
        Dict[str, AutomationRecommendationEntry],
        "A dictionary where the keys are automation IDs and the values are objects containing a list of alternatives for that automation"
    ]
