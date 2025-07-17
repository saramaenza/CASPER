import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from datetime import date
from datetime import datetime
import skfuzzy.control as ctrl
from problems.fuzzy_utils import getData, rule_to_natural_language, evaluate_rules, getSeason
import pytz

# Define fuzzy variables
temperature = ctrl.Antecedent(np.arange(0, 41, 1), 'temperature')
sound_pressure = ctrl.Antecedent(np.arange(0, 181, 1), 'sound_pressure')
time_of_day = ctrl.Antecedent(np.arange(0, 25, 1), 'time_of_day')
illuminance = ctrl.Antecedent(np.arange(0, 101, 1), 'illuminance')
season = ctrl.Antecedent(np.arange(0, 5, 1), 'season')
humidity = ctrl.Antecedent(np.arange(0, 101, 1), 'humidity')
aqi = ctrl.Antecedent(np.arange(0, 401, 1), 'aqi')

wellbeing_problem = ctrl.Consequent(np.arange(0, 101, 1), 'wellbeing_problem')

# Define membership functions
temperature['low'] = fuzz.trimf(temperature.universe, [0, 0, 20])
temperature['medium'] = fuzz.trimf(temperature.universe, [10, 20, 30])
temperature['high'] = fuzz.trimf(temperature.universe, [20, 40, 40])

humidity['low'] = fuzz.trimf(humidity.universe, [0, 0, 50])
humidity['medium'] = fuzz.trimf(humidity.universe, [30, 50, 70])
humidity['high'] = fuzz.trimf(humidity.universe, [50, 100, 100])

season['winter'] = fuzz.trimf(season.universe, [0, 0, 0])
season['spring'] = fuzz.trimf(season.universe, [1, 1, 1])
season['summer'] = fuzz.trimf(season.universe, [2, 2, 2])
season['autumn'] = fuzz.trimf(season.universe, [3, 3, 3])
season['none'] = fuzz.trimf(season.universe, [4, 4, 4])

time_of_day['morning'] = fuzz.trimf(time_of_day.universe, [6, 6, 12])
time_of_day['afternoon'] = fuzz.trimf(time_of_day.universe, [12, 12, 18])
time_of_day['evening'] = fuzz.trimf(time_of_day.universe, [18, 18, 24])
time_of_day['night'] = fuzz.trimf(time_of_day.universe, [0, 0, 6])
time_of_day['none'] = fuzz.trimf(time_of_day.universe, [25, 25, 25])

#rif: https://aqicn.org/scale/
aqi['good'] = fuzz.trimf(aqi.universe, [0, 0, 50])
aqi['moderate'] = fuzz.trimf(aqi.universe, [51, 51, 100])
aqi['unhealthy'] = fuzz.trimf(aqi.universe, [101, 101, 200])
aqi['very_unhealthy'] = fuzz.trimf(aqi.universe, [201, 201, 300])
aqi['hazardous'] = fuzz.trimf(aqi.universe, [301, 400, 400])

#rif: https://hoerluchs.com/en/hearing-protection/noise/ 
sound_pressure['low'] = fuzz.trimf(sound_pressure.universe, [0, 0, 65])
sound_pressure['medium'] = fuzz.trimf(sound_pressure.universe, [50, 75, 100])
sound_pressure['high'] = fuzz.trimf(sound_pressure.universe, [85, 180, 180])

illuminance['low'] = fuzz.trimf(illuminance.universe, [0, 0, 50])
illuminance['medium'] = fuzz.trimf(illuminance.universe, [30, 50, 70])
illuminance['high'] = fuzz.trimf(illuminance.universe, [50, 100, 100])

wellbeing_problem['no'] = fuzz.trimf(wellbeing_problem.universe, [0, 0, 20])
wellbeing_problem['low'] = fuzz.trimf(wellbeing_problem.universe, [20, 30, 50])
wellbeing_problem['moderate'] = fuzz.trimf(wellbeing_problem.universe, [25, 50, 75])
wellbeing_problem['high'] = fuzz.trimf(wellbeing_problem.universe, [50, 100, 100])

## ------------------------  DEFINE RULES FOR GOAL WELL-BEING ------------------------------

# ** variable "temperature" **
#Temperature is too high
rule1_1 = ctrl.Rule(temperature['high'], wellbeing_problem['moderate'])  
rule1_2 = ctrl.Rule(temperature['medium'], wellbeing_problem['no'])  
rule1_3 = ctrl.Rule(temperature['low'], wellbeing_problem['no'])  

#It's summer and the temperature is too high
rule2_1 = ctrl.Rule(season['summer'] & temperature['high'], wellbeing_problem['high'])
rule2_2 = ctrl.Rule(season['summer'] & temperature['medium'], wellbeing_problem['moderate'])
rule2_3 = ctrl.Rule(season['summer'] & temperature['low'], wellbeing_problem['no'])
rule2_4 = ctrl.Rule(season['winter'] & temperature['high'], wellbeing_problem['no'])
rule2_5 = ctrl.Rule(season['winter'] & temperature['medium'], wellbeing_problem['no'])
rule2_6 = ctrl.Rule(season['winter'] & temperature['low'], wellbeing_problem['no'])
rule2_7 = ctrl.Rule(season['spring'] & temperature['high'], wellbeing_problem['no'])
rule2_8 = ctrl.Rule(season['spring'] & temperature['medium'], wellbeing_problem['no'])
rule2_9 = ctrl.Rule(season['spring'] & temperature['low'], wellbeing_problem['no'])
rule2_10 = ctrl.Rule(season['autumn'] & temperature['high'], wellbeing_problem['no'])
rule2_11 = ctrl.Rule(season['autumn'] & temperature['medium'], wellbeing_problem['no'])
rule2_12 = ctrl.Rule(season['autumn'] & temperature['low'], wellbeing_problem['no'])
rule2_13 = ctrl.Rule(season['none'] & temperature['high'], wellbeing_problem['no'])
rule2_14 = ctrl.Rule(season['none'] & temperature['medium'], wellbeing_problem['no'])
rule2_15 = ctrl.Rule(season['none'] & temperature['low'], wellbeing_problem['no'])


#It's winter and the temperature is too low
rule3_1 = ctrl.Rule(season['winter'] & temperature['high'], wellbeing_problem['no'])
rule3_2 = ctrl.Rule(season['winter'] & temperature['medium'], wellbeing_problem['no'])
rule3_3 = ctrl.Rule(season['winter'] & temperature['low'], wellbeing_problem['high'])
rule3_4 = ctrl.Rule(season['summer'] & temperature['high'], wellbeing_problem['no'])
rule3_5 = ctrl.Rule(season['summer'] & temperature['medium'], wellbeing_problem['no'])
rule3_6 = ctrl.Rule(season['summer'] & temperature['low'], wellbeing_problem['no'])
rule3_7 = ctrl.Rule(season['spring'] & temperature['high'], wellbeing_problem['no'])
rule3_8 = ctrl.Rule(season['spring'] & temperature['medium'], wellbeing_problem['no'])
rule3_9 = ctrl.Rule(season['spring'] & temperature['low'], wellbeing_problem['no'])
rule3_10 = ctrl.Rule(season['autumn'] & temperature['high'], wellbeing_problem['no'])
rule3_11 = ctrl.Rule(season['autumn'] & temperature['medium'], wellbeing_problem['no'])
rule3_12 = ctrl.Rule(season['autumn'] & temperature['low'], wellbeing_problem['no'])
rule3_13 = ctrl.Rule(season['none'] & temperature['high'], wellbeing_problem['no'])
rule3_14 = ctrl.Rule(season['none'] & temperature['medium'], wellbeing_problem['no'])
rule3_15 = ctrl.Rule(season['none'] & temperature['low'], wellbeing_problem['no'])


# ** variable "humidity" **

#It's summer and the humidity is too high
rule4_1 = ctrl.Rule(season['summer'] & humidity['high'], wellbeing_problem['high'])
rule4_2 = ctrl.Rule(season['summer'] & humidity['medium'], wellbeing_problem['moderate'])
rule4_3 = ctrl.Rule(season['summer'] & humidity['low'], wellbeing_problem['no'])
rule4_4 = ctrl.Rule(season['winter'] & humidity['high'], wellbeing_problem['no'])
rule4_5 = ctrl.Rule(season['winter'] & humidity['medium'], wellbeing_problem['no'])
rule4_6 = ctrl.Rule(season['winter'] & humidity['low'], wellbeing_problem['no'])
rule4_7 = ctrl.Rule(season['spring'] & humidity['high'], wellbeing_problem['no'])
rule4_8 = ctrl.Rule(season['spring'] & humidity['medium'], wellbeing_problem['no'])
rule4_9 = ctrl.Rule(season['spring'] & humidity['low'], wellbeing_problem['no'])
rule4_10 = ctrl.Rule(season['autumn'] & humidity['high'], wellbeing_problem['no'])
rule4_11 = ctrl.Rule(season['autumn'] & humidity['medium'], wellbeing_problem['no'])
rule4_12 = ctrl.Rule(season['autumn'] & humidity['low'], wellbeing_problem['no'])
rule4_13 = ctrl.Rule(season['none'] & humidity['high'], wellbeing_problem['no'])
rule4_14 = ctrl.Rule(season['none'] & humidity['medium'], wellbeing_problem['no'])
rule4_15 = ctrl.Rule(season['none'] & humidity['low'], wellbeing_problem['no'])


#Air qualità index is bad
rule5_1 = ctrl.Rule(aqi['good'], wellbeing_problem['no'])  
rule5_2 = ctrl.Rule(aqi['moderate'], wellbeing_problem['low'])  
rule5_3 = ctrl.Rule(aqi['unhealthy'], wellbeing_problem['moderate']) 
rule5_4 = ctrl.Rule(aqi['very_unhealthy'], wellbeing_problem['high'])  
rule5_5 = ctrl.Rule(aqi['hazardous'], wellbeing_problem['high']) 

# ** variable "sound_pressure" **

#Sound pressure is too high
rule6_1 = ctrl.Rule(sound_pressure['low'], wellbeing_problem['no'])  
rule6_2 = ctrl.Rule(sound_pressure['medium'], wellbeing_problem['moderate'])  
rule6_3 = ctrl.Rule(sound_pressure['high'], wellbeing_problem['high']) 

#Nois is too hight and it's night time
rule8_1 = ctrl.Rule(sound_pressure['high'] & time_of_day['night'], wellbeing_problem['high'])  
rule8_2 = ctrl.Rule(sound_pressure['medium'] & time_of_day['night'], wellbeing_problem['moderate'])  
rule8_3 = ctrl.Rule(sound_pressure['low'] & time_of_day['night'], wellbeing_problem['low'])  
rule8_4 = ctrl.Rule(sound_pressure['high'] & time_of_day['morning'], wellbeing_problem['no'])  
rule8_5 = ctrl.Rule(sound_pressure['medium'] & time_of_day['morning'], wellbeing_problem['no'])  
rule8_6 = ctrl.Rule(sound_pressure['low'] & time_of_day['morning'], wellbeing_problem['no']) 
rule8_7 = ctrl.Rule(sound_pressure['high'] & time_of_day['afternoon'], wellbeing_problem['no'])  
rule8_8 = ctrl.Rule(sound_pressure['medium'] & time_of_day['afternoon'], wellbeing_problem['no'])  
rule8_9 = ctrl.Rule(sound_pressure['low'] & time_of_day['afternoon'], wellbeing_problem['no']) 
rule8_10 = ctrl.Rule(sound_pressure['high'] & time_of_day['evening'], wellbeing_problem['no'])  
rule8_11 = ctrl.Rule(sound_pressure['medium'] & time_of_day['evening'], wellbeing_problem['no'])  
rule8_12 = ctrl.Rule(sound_pressure['low'] & time_of_day['evening'], wellbeing_problem['no']) 
rule8_13 = ctrl.Rule(sound_pressure['high'] & time_of_day['none'], wellbeing_problem['no'])  
rule8_14 = ctrl.Rule(sound_pressure['medium'] & time_of_day['none'], wellbeing_problem['no'])  
rule8_15 = ctrl.Rule(sound_pressure['low'] & time_of_day['none'], wellbeing_problem['no']) 

# ** variable illuminance ** 

#Illuminance is too high and it's night time
rule7_1 = ctrl.Rule(illuminance['high'] & time_of_day['night'], wellbeing_problem['high'])  
rule7_2 = ctrl.Rule(illuminance['medium'] & time_of_day['night'], wellbeing_problem['moderate'])  
rule7_3 = ctrl.Rule(illuminance['low'] & time_of_day['night'], wellbeing_problem['no'])  
rule7_4 = ctrl.Rule(illuminance['high'] & time_of_day['morning'], wellbeing_problem['no'])  
rule7_5 = ctrl.Rule(illuminance['medium'] & time_of_day['morning'], wellbeing_problem['no'])  
rule7_6 = ctrl.Rule(illuminance['low'] & time_of_day['morning'], wellbeing_problem['no']) 
rule7_7 = ctrl.Rule(illuminance['high'] & time_of_day['afternoon'], wellbeing_problem['no'])  
rule7_8 = ctrl.Rule(illuminance['medium'] & time_of_day['afternoon'], wellbeing_problem['no'])  
rule7_9 = ctrl.Rule(illuminance['low'] & time_of_day['afternoon'], wellbeing_problem['no']) 
rule7_10 = ctrl.Rule(illuminance['high'] & time_of_day['evening'], wellbeing_problem['no'])  
rule7_11 = ctrl.Rule(illuminance['medium'] & time_of_day['evening'], wellbeing_problem['no'])  
rule7_12 = ctrl.Rule(illuminance['low'] & time_of_day['evening'], wellbeing_problem['no']) 
rule7_13 = ctrl.Rule(illuminance['high'] & time_of_day['none'], wellbeing_problem['no'])  
rule7_14 = ctrl.Rule(illuminance['medium'] & time_of_day['none'], wellbeing_problem['no'])  
rule7_15 = ctrl.Rule(illuminance['low'] & time_of_day['none'], wellbeing_problem['no']) 

def getWellBeingFuzzy(rules, area, environment, environmentVariables, ha_client):
    #print("\n********* WELL BEING ************\n")
    # Funzione di supporto per ottenere i dati

    # Ottieni i dati
    temperatureValue = getData(area, "temperature", environmentVariables, ha_client) or 0
    humidityValue = getData(area, "humidity", environmentVariables, ha_client) or 0
    aqiValue = getData(area, "aqi", environmentVariables, ha_client) or 0
    soundPressureValue = getData(area, "sound_pressure", environmentVariables, ha_client) or 0
    lightLevelValue = getData(area, "illuminance", environmentVariables, ha_client) or 0

    
    todayDate = date.today()
    current_season = getSeason(todayDate)
    time_zone = pytz.timezone('Europe/Rome')
    timeOfTheDayValue = datetime.now(time_zone).hour
    
    
    data_env = {
        "temperature": float(temperatureValue) if temperatureValue not in [None, 'unavailable', 'unknown'] else 0,
        "season": current_season,
        "humidity": float(humidityValue) if humidityValue not in [None, 'unavailable', 'unknown'] else 0,
        "sound_pressure": float(soundPressureValue),
        "aqi": float(aqiValue),
        "illuminance": float(lightLevelValue) if lightLevelValue not in [None, 'unavailable', 'unknown'] else 0,
        "time_of_day": timeOfTheDayValue
    }

    # Dizionario per mappare le regole ai loro dettagli
    rule_configs = {
        'rule1': {'rules': [rule1_1, rule1_2, rule1_3], 'inputs': ['temperature']},
        'rule2': {'rules': [rule2_1, rule2_2, rule2_3, rule2_4, rule2_5, rule2_6, rule2_7, rule2_8, rule2_9, rule2_10, rule2_11, rule2_12, rule2_13, rule2_14, rule2_15], 'inputs': ['temperature', 'season']},
        'rule3': {'rules': [rule3_1, rule3_2, rule3_3, rule3_4, rule3_5, rule3_6, rule3_7, rule3_8, rule3_9, rule3_10, rule3_11, rule3_12, rule3_13, rule3_14, rule3_15], 'inputs': ['temperature', 'season']},
        'rule4': {'rules': [rule4_1, rule4_2, rule4_3, rule4_4, rule4_5, rule4_6, rule4_7, rule4_8, rule4_9, rule4_10, rule4_11, rule4_12, rule4_13, rule4_14, rule4_15], 'inputs': ['humidity', 'season']},
        'rule5': {'rules': [rule5_1, rule5_2, rule5_3, rule5_4, rule5_5], 'inputs': ['aqi']},
        'rule6': {'rules': [rule6_1, rule6_2, rule6_3], 'inputs': ['sound_pressure']},
        'rule7': {'rules': [rule7_1, rule7_2, rule7_3, rule7_4, rule7_5, rule7_6, rule7_7, rule7_8, rule7_9, rule7_10, rule7_11, rule7_12, rule7_13, rule7_14, rule7_15], 'inputs': ['time_of_day', 'illuminance']},
        'rule8': {'rules': [rule8_1, rule8_2, rule8_3, rule8_4, rule8_5, rule8_6, rule8_7, rule8_8, rule8_9, rule8_10, rule8_11, rule8_12, rule8_13, rule8_14, rule8_15], 'inputs': ['time_of_day', 'sound_pressure']},
    }

    if rules not in rule_configs:
        return [], data_env

    config = rule_configs[rules]
    wellbeing_ctrl = ctrl.ControlSystem(config['rules'])
    rule_sim = ctrl.ControlSystemSimulation(wellbeing_ctrl)

    for input_var in config['inputs']:
        rule_sim.input[input_var] = data_env[input_var]

    try:
        rule_sim.compute()
        scoreValue = rule_sim.output['wellbeing_problem']
        activated_rules = evaluate_rules(rule_sim, config['rules'])

        activated_rules_consequent = []
        for rule_num, strength in activated_rules:
            #print(f"Viene attivata la regola n. {rules}_{rule_num}")
            rule_activated = config['rules'][rule_num - 1]
            rule_description = rule_to_natural_language(rule_activated)
            #print(rule_description)
            if "_problem[no]]" not in str(rule_activated.consequent):
                activated_rules_consequent.append((rule_activated.consequent, round(scoreValue, 2), rule_description, "rule" + str(rule_num)))

        if not activated_rules_consequent:
            #print("No problem detected\n")
            return [], data_env

        return max(activated_rules_consequent, key=lambda x: x[1]), data_env  
    
    except:
        #print("No problem detected\n")
        return [], data_env

