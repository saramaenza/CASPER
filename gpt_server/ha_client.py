import json
import requests
from requests import get, post
import ast
from typing import List, Dict, Any

class HomeAssistantClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            "Authorization": "Bearer " + token,
            "content-type": "application/json",
        }

    def _check_response(self, response: requests.Response) -> str:
        if response.status_code == 200:
            try:
                return response.json()
            except json.JSONDecodeError:
                # Se non è JSON valido, restituisci il testo
                return response.text.strip()
        else:
            print(f"HTTP Error {response.status_code}: {response.text}")
            response.raise_for_status()

    def _make_get_request(self, url_path: str) -> str:
        response = get(self.base_url + url_path, headers=self.headers)
        return self._check_response(response)

    def _make_post_request(self, url_path: str, data: Dict[str, Any]) -> str:
        response = post(self.base_url + url_path, headers=self.headers, data=json.dumps(data))
        return self._check_response(response)

    def get_all_states(self) -> str: # Returns raw JSON string
        return self._make_get_request("/api/states")

    def render_template(self, template: str) -> str:
        data = {"template": template}
        return self._make_post_request("/api/template", data)

    def get_device_id_from_entity_id(self, entity_id: str) -> str:
        template = '{{ device_id("' + entity_id + '") }}'
        rendered_template = self.render_template(template)
        # Il template device_id può restituire una stringa vuota se l'entità non ha un dispositivo associato
        # o se l'entità non esiste. Non è un errore, quindi restituiamo la stringa così com'è.
        return rendered_template

    def get_device_class_by_entity_id(self, entity_id: str) -> str:
        template = '{% for sensor in states %}{% if sensor.entity_id == "' + entity_id + '" %}{{ sensor.attributes.device_class }}{% endif %}{% endfor %}'
        return self.render_template(template)

    def get_entities_by_area(self, area: str) -> str: # Returns raw JSON string list of entities
        template = '{{ area_entities("' + area + '") }}'
        return self.render_template(template)

    def get_entities_by_domain_and_area(self, area: str, domain: str) -> List[str]:
        entities_by_area_str = self.get_entities_by_area(area)
        try:
            # ast.literal_eval è più sicuro di eval, ma json.loads è preferibile se il formato è JSON.
            # Home Assistant restituisce una stringa che rappresenta una lista Python, quindi ast.literal_eval è appropriato.
            entities_by_area = ast.literal_eval(entities_by_area_str)
            if not isinstance(entities_by_area, list):
                return []
        except (ValueError, SyntaxError):
            return []
        return [item for item in entities_by_area if isinstance(item, str) and item.startswith(domain)]

    def get_friendly_name(self, entity_id: str) -> str:
        template = '{{ state_attr("' + entity_id + '", "friendly_name") }}'
        return self.render_template(template)

    def get_device_name_by_user(self, device_id: str) -> str:
        template = '{{ device_attr("' + device_id + '", "name_by_user") }}'
        return self.render_template(template)

    def get_device_class_by_friendly_name(self, friendly_name: str) -> str:
        template = '{% for entity in states %}{% if entity.attributes.friendly_name == "' + friendly_name + '" %}{{ entity.attributes.device_class }}{% endif %}{% endfor %}'
        return self.render_template(template)
    
    def getRoomDevice(self, device_id: str) -> str:
        """Get the area/room name for a device"""
        template = '{{ area_name(device_attr("' + device_id + '", "area_id")) }}'
        return self.render_template(template)

    def save_automation(self, automation_json: Dict[str, Any], automation_id: str) -> str:
        if 'id' in automation_json:
            automation_json['id'] = str(automation_json['id'])
        resposne = self._make_post_request(f"/api/config/automation/config/{automation_id}", automation_json)
        print(f"Response from ha_client.save_automation: {resposne}")
        return resposne

