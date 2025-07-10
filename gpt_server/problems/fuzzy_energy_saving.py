import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import skfuzzy.control as ctrl
from problems.fuzzy_utils import getData, rule_to_natural_language, evaluate_rules

# Define fuzzy variables
energy = ctrl.Antecedent(np.arange(0, 101, 1), 'energy')
fan_state = ctrl.Antecedent(np.arange(0, 3, 1), 'fan_state')
window_open = ctrl.Antecedent(np.arange(0, 3, 1), 'window_open')
light_state = ctrl.Antecedent(np.arange(0, 3, 1), 'light_state')
heater_state = ctrl.Antecedent(np.arange(0, 3, 1), 'heater_state')
presence = ctrl.Antecedent(np.arange(0, 3, 1), 'presence')
person = ctrl.Antecedent(np.arange(0, 3, 1), 'person')
aqi = ctrl.Antecedent(np.arange(0, 401, 1), 'aqi')
illuminance = ctrl.Antecedent(np.arange(0, 101, 1), 'illuminance')

energy_saving_problem = ctrl.Consequent(np.arange(0, 101, 1), 'energy_saving_problem')

energy['low'] = fuzz.trimf(energy.universe, [0, 0, 1])
energy['medium'] = fuzz.trimf(energy.universe, [1, 2, 2])
energy['high'] = fuzz.trimf(energy.universe, [2, 100, 100])

window_open['closed'] = fuzz.trimf(window_open.universe, [0, 0, 0])
window_open['open'] = fuzz.trimf(window_open.universe, [1, 1, 1])
window_open['none'] = fuzz.trimf(window_open.universe, [2, 2, 2])

fan_state['off'] = fuzz.trimf(fan_state.universe, [0, 0, 0])
fan_state['on'] = fuzz.trimf(fan_state.universe, [1, 1, 1])
fan_state['none'] = fuzz.trimf(fan_state.universe, [2, 2, 2])

light_state['off'] = fuzz.trimf(light_state.universe, [0, 0, 0])
light_state['on'] = fuzz.trimf(light_state.universe, [1, 1, 1])
light_state['none'] = fuzz.trimf(light_state.universe, [2, 2, 2])

heater_state['off'] = fuzz.trimf(heater_state.universe, [0, 0, 0])
heater_state['on'] = fuzz.trimf(heater_state.universe, [1, 1, 1])
heater_state['none'] = fuzz.trimf(heater_state.universe, [2, 2, 2])

presence['true'] = fuzz.trimf(presence.universe, [0, 0, 0])
presence['false'] = fuzz.trimf(presence.universe, [1, 1, 1])
presence['none'] = fuzz.trimf(presence.universe, [2, 2, 2])

person['home'] = fuzz.trimf(person.universe, [0, 0, 0])
person['not_home'] = fuzz.trimf(person.universe, [1, 1, 1])
person['none'] = fuzz.trimf(person.universe, [2, 2, 2])

#rif: https://aqicn.org/scale/
aqi['good'] = fuzz.trimf(aqi.universe, [0, 0, 50])
aqi['moderate'] = fuzz.trimf(aqi.universe, [51, 51, 100])
aqi['unhealthy'] = fuzz.trimf(aqi.universe, [101, 101, 200])
aqi['very_unhealthy'] = fuzz.trimf(aqi.universe, [201, 201, 300])
aqi['hazardous'] = fuzz.trimf(aqi.universe, [301, 400, 400])

illuminance['low'] = fuzz.trimf(illuminance.universe, [0, 0, 50])
illuminance['medium'] = fuzz.trimf(illuminance.universe, [30, 50, 70])
illuminance['high'] = fuzz.trimf(illuminance.universe, [50, 100, 100])

energy_saving_problem['no'] = fuzz.trimf(energy_saving_problem.universe, [0, 0, 20])
energy_saving_problem['low'] = fuzz.trimf(energy_saving_problem.universe, [20, 30, 50])
energy_saving_problem['moderate'] = fuzz.trimf(energy_saving_problem.universe, [25, 50, 75])
energy_saving_problem['high'] = fuzz.trimf(energy_saving_problem.universe, [50, 100, 100])


## ----------------------  DEFINE RULES FOR ENERGY SAVING -----------------------------

# ** variable "energy" **

#energy consumption is too high #TODO: considera la somma dei consumi dei dispositivi
rule1_1 = ctrl.Rule(energy['low'], energy_saving_problem['no'])  
rule1_2 = ctrl.Rule(energy['medium'], energy_saving_problem['moderate'])  
rule1_3 = ctrl.Rule(energy['high'], energy_saving_problem['high']) 

#fan is on while windows are open
rule2_1 = ctrl.Rule(fan_state['on'] & window_open['open'], energy_saving_problem['high'])  
rule2_2 = ctrl.Rule(fan_state['on'] & window_open['closed'], energy_saving_problem['no'])   
rule2_3 = ctrl.Rule(fan_state['off'] & window_open['open'], energy_saving_problem['no'])  
rule2_4 = ctrl.Rule(fan_state['off'] & window_open['closed'], energy_saving_problem['no']) 
rule2_5 = ctrl.Rule(fan_state['none'] & window_open['open'], energy_saving_problem['no']) 
rule2_6 = ctrl.Rule(fan_state['none'] & window_open['closed'], energy_saving_problem['no']) 
rule2_7 = ctrl.Rule(fan_state['on'] & window_open['none'], energy_saving_problem['no']) 
rule2_8 = ctrl.Rule(fan_state['off'] & window_open['none'], energy_saving_problem['no']) 
rule2_9 = ctrl.Rule(fan_state['none'] & window_open['none'], energy_saving_problem['no']) 

#lights are on while nobody is in the room
rule3_1 = ctrl.Rule(light_state['on'] & presence['false'], energy_saving_problem['high'])  
rule3_2 = ctrl.Rule(light_state['on'] & presence['true'], energy_saving_problem['no'])   
rule3_3 = ctrl.Rule(light_state['off'] & presence['true'], energy_saving_problem['no'])  
rule3_4 = ctrl.Rule(light_state['off'] & presence['false'], energy_saving_problem['no']) 

#light are on while nobody is at home
rule4_1 = ctrl.Rule(light_state['on'] & person['not_home'], energy_saving_problem['high'])  
rule4_2 = ctrl.Rule(light_state['on'] & person['home'], energy_saving_problem['no'])   
rule4_3 = ctrl.Rule(light_state['off'] & person['home'], energy_saving_problem['no'])  
rule4_4 = ctrl.Rule(light_state['off'] & person['home'], energy_saving_problem['no']) 

#heater is on while nobody is at home
rule5_1 = ctrl.Rule(heater_state['on'] & person['not_home'], energy_saving_problem['high'])  
rule5_2 = ctrl.Rule(heater_state['on'] & person['home'], energy_saving_problem['no'])   
rule5_3 = ctrl.Rule(heater_state['off'] & person['home'], energy_saving_problem['no'])  
rule5_4 = ctrl.Rule(heater_state['off'] & person['home'], energy_saving_problem['no']) 

# Regole per purificatore d'aria ridondante
rule6_1 = ctrl.Rule(fan_state['on'] & aqi['good'], energy_saving_problem['high'])
rule6_2 = ctrl.Rule(fan_state['on'] & aqi['moderate'], energy_saving_problem['low'])
rule6_3 = ctrl.Rule(fan_state['on'] & aqi['unhealthy'], energy_saving_problem['no'])
rule6_4 = ctrl.Rule(fan_state['on'] & aqi['very_unhealthy'], energy_saving_problem['no'])
rule6_5 = ctrl.Rule(fan_state['on'] & aqi['hazardous'], energy_saving_problem['no'])
rule6_6 = ctrl.Rule(fan_state['off'] & aqi['good'], energy_saving_problem['no'])
rule6_7 = ctrl.Rule(fan_state['off'] & aqi['moderate'], energy_saving_problem['no'])
rule6_8 = ctrl.Rule(fan_state['off'] & aqi['unhealthy'], energy_saving_problem['no'])
rule6_9 = ctrl.Rule(fan_state['off'] & aqi['very_unhealthy'], energy_saving_problem['no'])
rule6_10 = ctrl.Rule(fan_state['off'] & aqi['hazardous'], energy_saving_problem['no'])
'''
# Regole per illuminazione ridondante
rule7_1 = ctrl.Rule(light_state['on'] & illuminance['high'], energy_saving_problem['moderate'])
rule7_2 = ctrl.Rule(light_state['on'] & illuminance['medium'], energy_saving_problem['low'])
rule7_3 = ctrl.Rule(light_state['on'] & illuminance['low'], energy_saving_problem['no'])
rule7_4 = ctrl.Rule(light_state['off'] & illuminance['high'], energy_saving_problem['no'])
rule7_5 = ctrl.Rule(light_state['off'] & illuminance['medium'], energy_saving_problem['no'])
rule7_6 = ctrl.Rule(light_state['off'] & illuminance['low'], energy_saving_problem['no'])
'''

def getEnergySavingFuzzy(rules, area, environment, nameDevice, environmentVariables, ha_client):
    #print("\n********* ENERGY SAVING ************\n")

    # Ottieni i dati
    energyValue = getData(area, "energy", environmentVariables, ha_client) or 0
    windowStateValue = getData(area, "window", environmentVariables, ha_client) or 2
    windowStateValue = 1 if windowStateValue == "Open" else 0
    fanStateValue = getData(area, "fan", environmentVariables, ha_client) or 2
    fanStateValue = 1 if fanStateValue == "On" else 0
    presenceState = getData(area, "motion", environmentVariables, ha_client) or 2
    presenceState = 1 if presenceState == "On" else 0
    lightState = getData(area, "light", environmentVariables, ha_client) or 2
    lightState = 1 if lightState == "On" else 0
    heaterState = getData(area, "heater", environmentVariables, ha_client) or 2
    heaterState = 1 if heaterState == "On" else 0
    personState = getData(area, "person", environmentVariables, ha_client) or 2
    personState = 0 if personState == "home" else 1
    aqiValue = getData(area, "aqi", environmentVariables, ha_client) or 0

    data_env = {
        "energy": energyValue,
        "window_open": windowStateValue,
        "fan_state": fanStateValue,
        "light_state": lightState,
        "presence": presenceState,
        "person": personState,
        "heater_state": heaterState,
        "aqi": aqiValue
    }
    
    # Dizionario per mappare le regole ai loro dettagli
    rule_configs = {
        'rule1': {'rules': [rule1_1, rule1_2, rule1_3], 'inputs': ['energy']},
        'rule2': {'rules': [rule2_1, rule2_2, rule2_3, rule2_4, rule2_5, rule2_6, rule2_7, rule2_8, rule2_9], 'inputs': ['window_open', 'fan_state']},
        'rule3': {'rules': [rule3_1, rule3_2, rule3_3, rule3_4], 'inputs': ['presence', 'light_state']},
        'rule4': {'rules': [rule4_1, rule4_2, rule4_3, rule4_4], 'inputs': ['person', 'light_state']},
        'rule5': {'rules': [rule5_1, rule5_2, rule5_3, rule5_4], 'inputs': ['person', 'heater_state']},
        'rule6': {'rules': [rule6_1, rule6_2, rule6_3, rule6_4, rule6_5, rule6_6, rule6_7, rule6_8, rule6_9, rule6_10], 'inputs': ['aqi', 'fan_state']}
    }

    if rules not in rule_configs:
        return [], data_env

    config = rule_configs[rules]
    energy_saving_ctrl = ctrl.ControlSystem(config['rules'])
    rule_sim = ctrl.ControlSystemSimulation(energy_saving_ctrl)
    for input_var in config['inputs']:
        rule_sim.input[input_var] = data_env[input_var]

    try:
        #print("assessing rules...")
        #print(config['rules'])
        rule_sim.compute()
        scoreValue = rule_sim.output['energy_saving_problem']
        activated_rules = evaluate_rules(rule_sim, config['rules'])
        #print(f"Score value: {scoreValue}")
        activated_rules_consequent = []
        for rule_num, strength in activated_rules:
            #print(f"Viene attivata la regola n. {rules}_{rule_num} con forza di attivazione {strength}")
            rule_activated = config['rules'][rule_num - 1]
            rule_description = rule_to_natural_language(rule_activated)
            #print(rule_description)
            if "_problem[no]]" not in str(rule_activated.consequent):
                activated_rules_consequent.append((rule_activated.consequent, round(scoreValue, 2), rule_description))

        if not activated_rules_consequent:
            #print("No problem detected for this rule set \n")
            return [], data_env 

        return max(activated_rules_consequent, key=lambda x: x[1]), data_env  
    except:
        #print("No problem detected\n")
        return [], data_env




