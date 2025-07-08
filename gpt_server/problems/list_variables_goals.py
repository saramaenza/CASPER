list_variables_goals = {
  "list_of_vars": {    
    "temperature": {    
      "negative_effect_on_goal": [
        {  
          "goal": "well-being",
          "description": "Le alte temperature possono causare malessere, sudorazione e irritabilità. Inoltre, un ambiente troppo caldo può provocare stanchezza, riduzione della concentrazione e sonnolenza.",
          "when": [{
            "fuzzyRulesToCheck": "rule1",
            "variable_effect": "decrease"
          }]
        },
        {
          "goal": "well-being",
          "description": "In estate, le alte temperature possono rendere l'ambiente meno confortevole e piacevole",
          "when": [{
            "fuzzyRulesToCheck": "rule2",
            "variable_effect": "increase"
          }] 
        },
        {
          "goal": "well-being",
          "description": "In inverno, le basse temperature possono rendere l'ambiente meno confortevole e piacevole",
          "when": [{
            "fuzzyRulesToCheck": "rule3",
            "variable_effect": "increase"
          }] 
        },
        {
          "goal": "well-being",
          "description": "La temperatura dell'ambiente (...) è più alta del desiderato",
          "when": [{
            "fuzzyRulesToCheck": "none",
            "variable_effect": "increase",
            "desidered_value": True
          }] 
        },
        {
          "goal": "well-being",
          "description": "La temperatura dell'ambiente (...) è più bassa del desiderato",
          "when": [{
            "fuzzyRulesToCheck": "none",
            "variable_effect": "decrease",
            "desidered_value": True
          }] 
        }
          
      ]
    },
    "humidity": {
      "negative_effect_on_goal": [
        {  
          "goal": "wellbeing",
          "description": "un'elevata umidità può far sentire le persone appiccicose e a disagio, specialmente durante i mesi estivi",
          "when": [{
            "fuzzyRulesToCheck": "rule4",
            "variable_effect": "increase"
          }]    
        },
        {
          "goal": "well-being",
          "description": "l'umidità dell'ambiente (...) è più alta del desiderato",
          "when": [{
            "fuzzyRulesToCheck": "none",
            "variable_effect": "increase",
            "desidered_value": True
          }] 
        },
        {
          "goal": "well-being",
          "description": "l'umidità dell'ambiente (...) è più bassa del desiderato",
          "when": [{
            "fuzzyRulesToCheck": "none",
            "variable_effect": "decrease",
            "desidered_value": True
          }] 
        }
      ]
    },
    "illuminance": {
      "negative_effect_on_goal": [
        {  
          "goal": "wellbeing",
          "description": "L'esposizione a luci intense, specialmente di notte, può interferire con il ritmo circadiano e disturbare il sonno",
          "when": [{
            "fuzzyRulesToCheck": "rule7",
            "variable_effect": "increase"
          }]      
        },
        {  
          "goal": "health",
          "description": "L'esposizione a luci intense, specialmente di notte, può interferire con il ritmo circadiano e disturbare il sonno",
          "when": [{
            "fuzzyRulesToCheck": "rule2",
            "variable_effect": "increase"
          }] 
        },
        {
          "goal": "security",
          "description": "La scarsa illuminazione aumenta il rischio di incidenti e facilita la possibilità che intrusi si nascondano, riducendo la sicurezza",
          "when": [{
            "fuzzyRulesToCheck": "rule1",
            "variable_effect": "decrease"
          }] 
        },
        {
          "goal": "safety",
          "description": "L'illuminazione insufficiente può aumentare il rischio di cadute e incidenti, poiché ostacoli e pericoli non sono facilmente visibili",
          "when": [{
            "fuzzyRulesToCheck": "rule1",
            "variable_effect": "decrease"
          }] 
        }
      ]
    },
    "aqi": {
  "negative_effect_on_goal": [
    {
      "goal": "wellbeing",
      "description": "La presenza di inquinanti genera odori sgradevoli, rendendo l'ambiente scomodo",
      "when": [{
        "fuzzyRulesToCheck": "rule5",
        "variable_effect": "decrease"
      }] 
    },
    {
      "goal": "health",
      "description": "Una scarsa qualità dell'aria può causare disagio fisico, come una sensazione di soffocamento, mal di testa e stanchezza.",
      "when": [{
        "fuzzyRulesToCheck": "rule5",
        "variable_effect": "decrease"
      }] 
    },
    {
      "goal": "health",
      "description": "Una scarsa qualità dell'aria può causare o peggiorare problemi respiratori come asma, bronchite e altre malattie polmonari",
      "when": [{
        "fuzzyRulesToCheck": "rule5",
        "variable_effect": "decrease"
      }] 
    },
    {
      "goal": "health",
      "description": "Un tale livello di CO2 può causare sonnolenza e scarsa qualità dell'aria",
      "when": [{
        "fuzzyRulesToCheck": "rule3",
        "variable_effect": "decrease"
      }] 
    },
    {
      "goal": "health",
      "description": "Un tale livello di CO2 può causare mal di testa, sonnolenza e aria stagnante, viziata e soffocante",
      "when": [{
        "fuzzyRulesToCheck": "rule4",
        "variable_effect": "decrease"
      }] 
    },
    {
      "goal": "health",
      "description": "Un tale livello di CO2 può causare scarsa concentrazione, perdita di attenzione, aumento della frequenza cardiaca e lieve nausea",
      "when": [{
        "fuzzyRulesToCheck": "rule4",
        "variable_effect": "decrease"
      }] 
    },
    {
      "goal": "health",
      "description": "Un tale livello di CO2 può causare una carenza di ossigeno che porta a danni cerebrali permanenti, coma e persino alla morte",
      "when": [{
        "fuzzyRulesToCheck": "rule7",
        "variable_effect": "decrease"
      }] 
    }
  ]
},
"sound_pressure": {
  "negative_effect_on_goal": [
    {
      "goal": "well-being",
      "description": "Livelli sonori elevati possono causare disagio, rendere l'ambiente sgradevole e aumentare i livelli di stress",
      "when": [{
        "fuzzyRulesToCheck": "rule6",
        "variable_effect": "increase"
      }] 
    }, 
    {
      "goal": "well-being",
      "description": "Il rumore notturno può disturbare il sonno, causare disagio e influire negativamente sul benessere generale aumentando lo stress e riducendo la qualità del riposo",
      "when": [{
        "fuzzyRulesToCheck": "rule8",
        "variable_effect": "increase"
      }] 
    }, 
    {  
      "goal": "health",
      "description": "L'esposizione prolungata a rumori forti può causare danni all'udito",
      "when": [{
        "fuzzyRulesToCheck": "rule6",
        "variable_effect": "increase"
      }]    
    }
  ]
},
"energy": {    
  "negative_effect_on_goal": [
    {  
      "goal": "energy saving",
      "description": "Questo dispositivo consuma una quantità significativa di energia",
      "when": [{
        "fuzzyRulesToCheck": "rule1",
        "variable_effect": "increase"
      }] 
    },
    {  
      "goal": "energy saving",
      "description": "La finestra aperta e il purificatore d'aria acceso causano spreco di energia",
      "when": [{
        "fuzzyRulesToCheck": "rule2",
        "variable_effect": "none"
      }] 
    },
    {  
      "goal": "energy saving",
      "description": "La luce nella stanza è accesa senza che ci sia nessuno, causando spreco di energia",
      "when": [{
        "fuzzyRulesToCheck": "rule3",
        "variable_effect": "none"
      }] 
    },
    {  
      "goal": "energy saving",
      "description": "La luce è accesa quando nessuno è in casa, causando spreco di energia",
      "when": [{
        "fuzzyRulesToCheck": "rule4",
        "variable_effect": "none"
      }] 
    },
    {  
      "goal": "energy saving",
      "description": "Il riscaldamento è acceso quando nessuno è in casa, causando spreco di energia",
      "when": [{
        "fuzzyRulesToCheck": "rule5",
        "variable_effect": "none"
      }] 
    }
  ]
}    
  }
}
