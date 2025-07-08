import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import skfuzzy.control as ctrl
from problems.fuzzy_utils import getData, rule_to_natural_language, evaluate_rules

# Define fuzzy variables
illuminance = ctrl.Antecedent(np.arange(0, 102, 1), 'illuminance')
presence = ctrl.Antecedent(np.arange(0, 3, 1), 'presence')

safety_problem = ctrl.Consequent(np.arange(0, 101, 1), 'safety_problem')

# Define membership functions
illuminance['low'] = fuzz.trimf(illuminance.universe, [0, 0, 50])
illuminance['medium'] = fuzz.trimf(illuminance.universe, [30, 50, 70])
illuminance['high'] = fuzz.trimf(illuminance.universe, [50, 100, 100])
illuminance['none'] = fuzz.trimf(illuminance.universe, [101, 101, 101])

presence['true'] = fuzz.trimf(presence.universe, [0, 0, 0])
presence['false'] = fuzz.trimf(presence.universe, [1, 1, 1])
presence['none'] = fuzz.trimf(presence.universe, [2, 2, 2])

safety_problem['no'] = fuzz.trimf(safety_problem.universe, [0, 0, 20])
safety_problem['low'] = fuzz.trimf(safety_problem.universe, [20, 30, 50])
safety_problem['moderate'] = fuzz.trimf(safety_problem.universe, [25, 50, 75])
safety_problem['high'] = fuzz.trimf(safety_problem.universe, [50, 100, 100])

## ----------------------  DEFINE RULES FOR SAFETY -----------------------------

# ** variable "illuminance" **
#low illuminace can cause accidents
rule1_1 = ctrl.Rule(illuminance['low'] & presence['true'], safety_problem['high'])  
rule1_2 = ctrl.Rule(illuminance['medium'] & presence['false'], safety_problem['no'])  
rule1_3 = ctrl.Rule(illuminance['high'] & presence['none'], safety_problem['no'])  
rule1_4 = ctrl.Rule(illuminance['low'] & presence['false'], safety_problem['no'])  
rule1_5 = ctrl.Rule(illuminance['medium'] & presence['true'], safety_problem['no'])  
rule1_6 = ctrl.Rule(illuminance['high'] & presence['true'], safety_problem['no'])  
rule1_7 = ctrl.Rule(illuminance['high'] & presence['false'], safety_problem['no'])  
rule1_8 = ctrl.Rule(illuminance['low'] & presence['none'], safety_problem['no'])  
rule1_9 = ctrl.Rule(illuminance['medium'] & presence['none'], safety_problem['no'])  
rule1_10 = ctrl.Rule(illuminance['none'] & presence['false'], safety_problem['no'])  
rule1_11 = ctrl.Rule(illuminance['none'] & presence['none'], safety_problem['no'])  
rule1_12 = ctrl.Rule(illuminance['none'] & presence['true'], safety_problem['no'])  


def getSafetyFuzzy(rules, area, environment, environmentVariables):
    #print("\n********* SAFETY ************\n")
    
    # Ottieni i dati
    lightLevelValue = getData(area, "illuminance", environmentVariables) or 102
    presenceState = getData(area, "motion", environmentVariables) or 2
    presenceState = 1 if presenceState == "On" else 0

    data_env = {
        "illuminance": int(lightLevelValue),
        "presence": presenceState
    }

    # Dizionario per mappare le regole ai loro dettagli
    rule_configs = {
        'rule1': {'rules': [rule1_1, rule1_2, rule1_3, rule1_4, rule1_5, rule1_6, rule1_7, rule1_8, rule1_9, rule1_10, rule1_11, rule1_12], 'inputs': ['illuminance', 'presence']},
    }

    if rules not in rule_configs:
        return [], data_env

    config = rule_configs[rules]
    safety_ctrl = ctrl.ControlSystem(config['rules'])
    rule_sim = ctrl.ControlSystemSimulation(safety_ctrl)

    for input_var in config['inputs']:
        rule_sim.input[input_var] = data_env[input_var]

    rule_sim.compute()
    scoreValue = rule_sim.output['safety_problem']
    activated_rules = evaluate_rules(rule_sim, config['rules'])

    activated_rules_consequent = []
    for rule_num, strength in activated_rules:
        #print(f"Viene attivata la regola n. {rules}_{rule_num}")
        rule_activated = config['rules'][rule_num - 1]
        rule_description = rule_to_natural_language(rule_activated)
        #print(rule_description)
        if "_problem[no]]" not in str(rule_activated.consequent):
            activated_rules_consequent.append((rule_activated.consequent, round(scoreValue, 2), rule_description))

    if not activated_rules_consequent:
        #print("No problem detected\n")
        return [], data_env

    return max(activated_rules_consequent, key=lambda x: x[1]), data_env  





