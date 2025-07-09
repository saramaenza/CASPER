import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from datetime import datetime
import skfuzzy.control as ctrl
import pytz
from problems.fuzzy_utils import getData, rule_to_natural_language, evaluate_rules

# Define fuzzy variables
time_of_day = ctrl.Antecedent(np.arange(0, 25, 1), 'time_of_day')
illuminance = ctrl.Antecedent(np.arange(0, 101, 1), 'illuminance')
sound_pressure = ctrl.Antecedent(np.arange(0, 181, 1), 'sound_pressure')
aqi = ctrl.Antecedent(np.arange(0, 401, 1), 'aqi')
co2_level = ctrl.Antecedent(np.arange(250, 100000, 1), 'co2_level')

health_problem = ctrl.Consequent(np.arange(0, 101, 1), 'health_problem')

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

#rif: https://aqicn.org/scale/
aqi['good'] = fuzz.trimf(aqi.universe, [0, 0, 50])
aqi['moderate'] = fuzz.trimf(aqi.universe, [51, 51, 100])
aqi['unhealthy'] = fuzz.trimf(aqi.universe, [101, 101, 200])
aqi['very_unhealthy'] = fuzz.trimf(aqi.universe, [201, 201, 300])
aqi['hazardous'] = fuzz.trimf(aqi.universe, [301, 400, 400])

#rif: https://www.co2meter.com/blogs/news/carbon-dioxide-indoor-levels-chart e https://www.kane.co.uk/knowledge-centre/what-are-safe-levels-of-co-and-co2-in-rooms
co2_level['normal'] = fuzz.trimf(co2_level.universe, [250, 250, 1000])
co2_level['caution'] = fuzz.trimf(co2_level.universe, [1000, 1500, 2000])
co2_level['high_risk'] = fuzz.trimf(co2_level.universe, [2000, 3000, 5000])
co2_level['critical'] = fuzz.trimf(co2_level.universe, [5000, 100000, 100000])

health_problem['no'] = fuzz.trimf(health_problem.universe, [0, 0, 20])
health_problem['low'] = fuzz.trimf(health_problem.universe, [20, 30, 50])
health_problem['moderate'] = fuzz.trimf(health_problem.universe, [25, 50, 75])
health_problem['high'] = fuzz.trimf(health_problem.universe, [50, 100, 100])

## ----------------------  DEFINE RULES FOR HEALTH -----------------------------

# ** variable "illuminance" **

#Illuminance is too high and it's night time
rule2_1 = ctrl.Rule(illuminance['high'] & time_of_day['night'], health_problem['high'])  
rule2_2 = ctrl.Rule(illuminance['medium'] & time_of_day['night'], health_problem['moderate'])  
rule2_3 = ctrl.Rule(illuminance['low'] & time_of_day['night'], health_problem['no'])  
rule2_4 = ctrl.Rule(illuminance['high'] & time_of_day['morning'], health_problem['no'])  
rule2_5 = ctrl.Rule(illuminance['medium'] & time_of_day['morning'], health_problem['no'])  
rule2_6 = ctrl.Rule(illuminance['low'] & time_of_day['morning'], health_problem['no']) 
rule2_7 = ctrl.Rule(illuminance['high'] & time_of_day['afternoon'], health_problem['no'])  
rule2_8 = ctrl.Rule(illuminance['medium'] & time_of_day['afternoon'], health_problem['no'])  
rule2_9 = ctrl.Rule(illuminance['low'] & time_of_day['afternoon'], health_problem['no']) 
rule2_10 = ctrl.Rule(illuminance['high'] & time_of_day['evening'], health_problem['no'])  
rule2_11 = ctrl.Rule(illuminance['medium'] & time_of_day['evening'], health_problem['no'])  
rule2_12 = ctrl.Rule(illuminance['low'] & time_of_day['evening'], health_problem['no']) 
rule2_13 = ctrl.Rule(illuminance['high'] & time_of_day['none'], health_problem['no'])  
rule2_14 = ctrl.Rule(illuminance['medium'] & time_of_day['none'], health_problem['no'])  
rule2_15 = ctrl.Rule(illuminance['low'] & time_of_day['none'], health_problem['no']) 

# ** variable "co2" **
#co2 is between 250 and 2000 ppm
rule3_1 = ctrl.Rule(co2_level['caution'], health_problem['low'])  
rule3_2 = ctrl.Rule(co2_level['normal'], health_problem['no'])  
rule3_3 = ctrl.Rule(co2_level['high_risk'], health_problem['no'])  
rule3_4 = ctrl.Rule(co2_level['critical'], health_problem['no'])  

#co2 is between 2000 and 5000 ppm
rule4_1 = ctrl.Rule(co2_level['high_risk'], health_problem['moderate'])
rule4_2 = ctrl.Rule(co2_level['normal'], health_problem['no'])  
rule4_3 = ctrl.Rule(co2_level['caution'], health_problem['no'])  
rule4_4 = ctrl.Rule(co2_level['critical'], health_problem['no'])    

#co2 is between 5000 and 100000 ppm
rule7_1 = ctrl.Rule(co2_level['critical'], health_problem['high']) 
rule7_2 = ctrl.Rule(co2_level['normal'], health_problem['no'])  
rule7_3 = ctrl.Rule(co2_level['caution'], health_problem['no'])  
rule7_4 = ctrl.Rule(co2_level['high_risk'], health_problem['no'])    


# ** variable "aqi" **

#Air qualità index is bad
rule5_1 = ctrl.Rule(aqi['good'], health_problem['no'])  
rule5_2 = ctrl.Rule(aqi['moderate'], health_problem['low'])  
rule5_3 = ctrl.Rule(aqi['unhealthy'], health_problem['moderate']) 
rule5_4 = ctrl.Rule(aqi['very_unhealthy'], health_problem['high'])  
rule5_5 = ctrl.Rule(aqi['hazardous'], health_problem['high']) 


# ** variable "sound_pressure" **

#Sound pressure is too high
rule6_1 = ctrl.Rule(sound_pressure['low'], health_problem['no'])  
rule6_2 = ctrl.Rule(sound_pressure['medium'], health_problem['moderate'])  
rule6_3 = ctrl.Rule(sound_pressure['high'], health_problem['high']) 


def getHealthFuzzy(rules, area, environment, environmentVariables):
    #print("\n********* HEALTH ************\n")
    

    # Ottieni i dati
    lightLevelValue = getData(area, "illuminance", environmentVariables) or 0
    soundPressureValue = getData(area, "sound_pressure", environmentVariables) or 0
    aqiValue = getData(area, "aqi", environmentVariables) or 0
    co2Value = getData(area, "carbon_dioxide", environmentVariables) or 0

   
    time_zone = pytz.timezone('Europe/Rome')
    timeOfTheDayValue = datetime.now(time_zone).hour


    data_env = {
        "illuminance": int(lightLevelValue) if lightLevelValue not in [None, 'unavailable', 'unknown'] else 0,
        "time_of_day": timeOfTheDayValue,
        "sound_pressure": soundPressureValue,
        "aqi": float(aqiValue),
        "co2_level": float(co2Value)
    }

    # Dizionario per mappare le regole ai loro dettagli
    rule_configs = {
        'rule2': {'rules': [rule2_1, rule2_2, rule2_3, rule2_4, rule2_5, rule2_6, rule2_7, rule2_8, rule2_9, rule2_10, rule2_11, rule2_12, rule2_13, rule2_14, rule2_15], 'inputs': ['time_of_day', 'illuminance']},
        'rule5': {'rules': [rule5_1, rule5_2, rule5_3, rule5_4, rule5_5], 'inputs': ['aqi']},
        'rule6': {'rules': [rule6_1, rule6_2, rule6_3], 'inputs': ['sound_pressure']},
        'rule3': {'rules': [rule3_1, rule3_2, rule3_3], 'inputs': ['co2_level']},
        'rule4': {'rules': [rule4_1, rule4_2, rule4_3], 'inputs': ['co2_level']},
        'rule7': {'rules': [rule7_1, rule7_2, rule7_3], 'inputs': ['co2_level']}
    }

    if rules not in rule_configs:
        return [], data_env

    config = rule_configs[rules]
    health_ctrl = ctrl.ControlSystem(config['rules'])
    rule_sim = ctrl.ControlSystemSimulation(health_ctrl)
    
    for input_var in config['inputs']:
        rule_sim.input[input_var] = data_env[input_var]

    try:
        rule_sim.compute()
        scoreValue = rule_sim.output['health_problem']
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
    except:
        #print("No problem detected\n")
        return [], data_env






