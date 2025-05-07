from typing import Optional
from typing_extensions import Annotated, TypedDict

class GenerateAutomationResponse(TypedDict):
  """Define the response format for the generate_automation tool."""
  automation: Annotated[dict, "The generated automation JSON."]
  description: Annotated[str, "The detailed description of the generated automation."]
  message: Annotated[Optional[str], "", "A message for the user."]