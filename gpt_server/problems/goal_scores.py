import numpy as np
from typing import Dict, List, Tuple, Optional
import sys
import os
import re
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import db_functions as _db
from datetime import datetime

class EnvironmentQualityCalculator:
    def __init__(self):
        # Mapping delle regole fuzzy per goal
        self.fuzzy_rules_mapping = {
            'energy': {
                'rule1': 'energy consumption is too high',
                'rule2': 'fan is on while windows are open', 
                'rule3': 'lights are on while nobody is in the room',
                'rule4': 'lights are on while nobody is at home',
                'rule5': 'heater is on while nobody is at home',
                'rule6': 'air purifier redundant (good air quality)',
                'rule7': 'redundant lighting (high illuminance)',
                'rule8': 'multiple heating devices active'
            },
            'well-being': {
                'rule1': 'temperature is too high',
                'rule2': 'summer and temperature is too high',
                'rule3': 'winter and temperature is too low', 
                'rule4': 'summer and humidity is too high',
                'rule5': 'air quality index is bad',
                'rule6': 'sound pressure is too high',
                'rule7': 'high illuminance during night time',
                'rule8': 'noise is too high during night time'
            },
            'health': {
                'rule2': 'high illuminance during night time',
                'rule3': 'CO2 level is moderate (1000-2000 ppm)',
                'rule4': 'CO2 level is high (2000-5000 ppm)', 
                'rule5': 'air quality index is bad',
                'rule6': 'sound pressure is too high',
                'rule7': 'CO2 level is critical (>5000 ppm)'
            },
            'security': {
                'rule1': 'low illuminance when nobody is home',
                'rule2': 'low illuminance with presence detected'
            }
        }

    def get_problems_from_goals_collection(self, user_id: str) -> Dict:
        try:
            goals_data = _db.get_problems_goals(user_id)
            if not goals_data:
                return {'energy': [], 'well-being': [], 'health': [], 'security': []}
            
            return {
                'energy': goals_data.get('energy', []),
                'well-being': goals_data.get('wellbeing', []),
                'health': goals_data.get('health', []),
                'security': goals_data.get('security', [])
            }
        except Exception as e:
            print(f"Errore nel recupero dei problemi: {e}")
            return {'energy': [], 'well-being': [], 'health': [], 'security': []}

    def extract_fuzzy_rule_from_problem(self, problem: Dict, goal: str) -> Tuple[str, float]:
        try:
            negative_effects = problem.get('negative_effects', [])
            if not negative_effects or len(negative_effects[0]) < 2:
                return 'unknown', 1.0
            
            effect_detail = negative_effects[0][1]
            if not isinstance(effect_detail, str):
                return 'unknown', 1.0
            
            # Estrai peso fuzzy
            weight = 1.0
            numbers = re.findall(r'np\.float64\((\d+\.?\d*)\)', effect_detail)
            if numbers:
                weight = float(numbers[0]) / 100.0
            
            # Estrai nome regola fuzzy
            rule_name = 'unknown'
            rule_match = re.search(r"'(rule\d+)'", effect_detail)
            if rule_match:
                rule_name = rule_match.group(1)
            
            return rule_name, weight
        except Exception as e:
            return 'unknown', 1.0

    def calculate_goal_quality_score(self, goal: str, problems_data: Dict) -> float:
        goal_problems = problems_data.get(goal, [])
        total_fuzzy_rules = len(self.fuzzy_rules_mapping.get(goal, {}))
        
        if not goal_problems or total_fuzzy_rules == 0:
            return 100.0

        infracted_rules = 0
        total_gravity_penalty = 0

        for problem in goal_problems:
            state = problem.get('state', 'unknown')
            
            if state == 'on':
                # Estrai severity score
                severity_score = 50
                negative_effects = problem.get('negative_effects', [])
                if negative_effects and len(negative_effects[0]) > 1:
                    effect_detail = negative_effects[0][1]
                    if isinstance(effect_detail, str):
                        numbers = re.findall(r'np\.float64\((\d+\.?\d*)\)', effect_detail)
                        if numbers:
                            severity_score = min(100, float(numbers[0]))
                
                # Estrai peso fuzzy
                fuzzy_rule, fuzzy_weight = self.extract_fuzzy_rule_from_problem(problem, goal)
                
                infracted_rules += 1
                gravity_penalty = (severity_score / 100.0) * fuzzy_weight
                total_gravity_penalty += gravity_penalty

        # Calcola punteggio finale
        if total_fuzzy_rules > 0:
            normalized_gravity_penalty = min(total_gravity_penalty, infracted_rules)
            impact_ratio = (infracted_rules + normalized_gravity_penalty) / total_fuzzy_rules
            quality_score = max(0, 100 - (impact_ratio * 100))
        else:
            quality_score = 100

        return round(quality_score, 1)

    def calculate_all_scores(self, user_id: str) -> Dict:
        problems_data = self.get_problems_from_goals_collection(user_id)
        goals = ['energy', 'well-being', 'health', 'security']
        
        scores = {}
        for goal in goals:
            scores[goal] = self.calculate_goal_quality_score(goal, problems_data)
        
        # Calcola punteggio complessivo con pesi
        weights = {'energy': 0.25, 'well-being': 0.30, 'health': 0.30, 'security': 0.15}
        overall_score = sum(scores[goal] * weights[goal] for goal in goals)
        scores['overall'] = round(overall_score, 1)
        
        return scores

def get_quality_scores_only(user_id: str) -> Dict:
    calculator = EnvironmentQualityCalculator()
    return calculator.calculate_all_scores(user_id)

# Esempio di utilizzo
if __name__ == "__main__":
    user_id = "6818c8ac24e5db8f9a0304e5"
    
    try:
        scores_only = get_quality_scores_only(user_id)
        for goal, score in scores_only.items():
            print(f"{goal}: {score}%")
    except Exception as e:
        print(f"Errore durante l'esecuzione: {e}")
        import traceback
        traceback.print_exc()