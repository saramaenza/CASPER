import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from problems.fuzzy_utils import getData, rule_to_natural_language, evaluate_rules

# Define fuzzy variables
temperature = ctrl.Antecedent(np.arange(0, 41, 1), 'temperature')
sound_pressure = ctrl.Antecedent(np.arange(0, 181, 1), 'sound_pressure')
time_of_day = ctrl.Antecedent(np.arange(0, 25, 1), 'time_of_day')
illuminance = ctrl.Antecedent(np.arange(0, 102, 1), 'illuminance')
person_home = ctrl.Antecedent(np.arange(0, 3, 1), 'person_home')

security_problem = ctrl.Consequent(np.arange(0, 101, 1), 'security_problem')

# Define membership functions
temperature['low'] = fuzz.trimf(temperature.universe, [0, 0, 20])
temperature['medium'] = fuzz.trimf(temperature.universe, [10, 20, 30])
temperature['high'] = fuzz.trimf(temperature.universe, [20, 40, 40])

#rif: https://hoerluchs.com/en/hearing-protection/noise/ 
sound_pressure['low'] = fuzz.trimf(sound_pressure.universe, [0, 0, 65])
sound_pressure['medium'] = fuzz.trimf(sound_pressure.universe, [50, 75, 100])
sound_pressure['high'] = fuzz.trimf(sound_pressure.universe, [85, 180, 180])

time_of_day['morning'] = fuzz.trimf(time_of_day.universe, [6, 6, 12])
time_of_day['afternoon'] = fuzz.trimf(time_of_day.universe, [12, 12, 18])
time_of_day['evening'] = fuzz.trimf(time_of_day.universe, [18, 18, 24])
time_of_day['night'] = fuzz.trimf(time_of_day.universe, [0, 0, 6])
time_of_day['none'] = fuzz.trimf(time_of_day.universe, [25, 25, 25])

illuminance['low'] = fuzz.trimf(illuminance.universe, [0, 0, 50])
illuminance['medium'] = fuzz.trimf(illuminance.universe, [30, 50, 70])
illuminance['high'] = fuzz.trimf(illuminance.universe, [50, 100, 100])
illuminance['none'] = fuzz.trimf(illuminance.universe, [101, 101, 101])

person_home['home'] = fuzz.trimf(person_home.universe, [0, 0, 0])
person_home['not_home'] = fuzz.trimf(person_home.universe, [1, 1, 1])
person_home['none'] = fuzz.trimf(person_home.universe, [2, 2, 2])

security_problem['no'] = fuzz.trimf(security_problem.universe, [0, 0, 20])
security_problem['low'] = fuzz.trimf(security_problem.universe, [20, 30, 50])
security_problem['moderate'] = fuzz.trimf(security_problem.universe, [25, 50, 75])
security_problem['high'] = fuzz.trimf(security_problem.universe, [50, 100, 100])

## ----------------------  DEFINE RULES FOR SECURITY -----------------------------

# ** variable "illuminance" **
#Illuminance is too low and there is no one home
rule1_1 = ctrl.Rule(illuminance['low'] & person_home['not_home'], security_problem['high'])  
rule1_2 = ctrl.Rule(illuminance['medium'] & person_home['not_home'], security_problem['no'])  
rule1_3 = ctrl.Rule(illuminance['high'] & person_home['not_home'], security_problem['no'])  
rule1_4 = ctrl.Rule(illuminance['low'] & person_home['home'], security_problem['no'])  
rule1_5 = ctrl.Rule(illuminance['medium'] & person_home['home'], security_problem['no'])  
rule1_6 = ctrl.Rule(illuminance['high'] & person_home['home'], security_problem['no'])  
rule1_7 = ctrl.Rule(illuminance['low'] & person_home['none'], security_problem['no'])  
rule1_8 = ctrl.Rule(illuminance['medium'] & person_home['none'], security_problem['no'])  
rule1_9 = ctrl.Rule(illuminance['high'] & person_home['none'], security_problem['no'])  
rule1_10 = ctrl.Rule(illuminance['none'] & person_home['none'], security_problem['no'])  
rule1_11 = ctrl.Rule(illuminance['none'] & person_home['home'], security_problem['no'])  
rule1_12 = ctrl.Rule(illuminance['none'] & person_home['not_home'], security_problem['no'])  


def getSecurityFuzzy(rules, area, environment, environmentVariables):
    print("\n********* SECURITY ************\n")
    

    # Ottieni i dati
    lightLevelValue = getData(area, "illuminance", environmentVariables) or 101
    personHomeValue = getData(area, "person", environmentVariables) or 2

    personHomeValue = 1 if personHomeValue == "home" else 0

    data_env = {
        "illuminance": float(lightLevelValue),
        "person_home": personHomeValue
    }

    # Dizionario per mappare le regole ai loro dettagli
    rule_configs = {
        'rule1': {'rules': [rule1_1, rule1_2, rule1_3, rule1_4, rule1_5, rule1_6, rule1_7, rule1_8, rule1_9, rule1_10, rule1_11, rule1_12], 'inputs': ['illuminance', 'person_home']},
    }

    if rules not in rule_configs:
        return [], data_env

    config = rule_configs[rules]
    security_ctrl = ctrl.ControlSystem(config['rules'])
    rule_sim = ctrl.ControlSystemSimulation(security_ctrl)

    for input_var in config['inputs']:
        rule_sim.input[input_var] = data_env[input_var]

    rule_sim.compute()
    scoreValue = rule_sim.output['security_problem']
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

