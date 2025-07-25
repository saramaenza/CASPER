const fs = require('fs');
//const db = require('./db.json');
const jwt = require('jsonwebtoken')
const secret = 'sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk'
const { MongoClient, ObjectId } = require("mongodb");


const uri =
  "mongodb://127.0.0.1:27017";
let dbName = "";
const setServerConfig = (server) => {
    dbName = server.db_name;
}

const client = new MongoClient(uri);
//crea nuovo utente e lo mette nel db
const createUser = async (name,surname,pass,email) =>{
    try{
        const database = client.db(dbName);
        const users = database.collection('users');
        let userinfo = await users.findOne({'email': email})
        if(userinfo == null){
            let user = {}
            user.name = name
            user.surname = surname
            user.password = pass
            user.email = email
            user.isGoogleAccount = false
            user.verified = true
            //user.verified = false
            let result = await users.insertOne(user);
            _id = result.insertedId.toString();
            //initUserData(_id);
            //fakeInit(_id);
            return 1; //user settato
        }else{
            return 0; //user esistente
        }
    } catch (err){
		console.log(err)
        return err
    }
}

const createGoogleUser = async (payload, fullInfo) =>{
    
    try{
        const database = client.db(dbName);
        const users = database.collection('users');
        let userinfo = await users.findOne({'email': payload.email})
        if(userinfo == null){
            let user = {}
            user.name = payload.given_name;
            user.surname = payload.family_name;
            user.password = undefined;
            user.email = payload.email
            user.isGoogleAccount = true
            user.verified = true
            let x = await users.insertOne(user);
            if(fullInfo == true){
                return ({id: x.insertedId, name: user.name, email: user.email})
            } else return x.insertedId; //user settato
        } else {
            if(fullInfo == true){
                return ({id: userinfo._id, name: userinfo.name, email: userinfo.email})
            } else return userinfo._id; //user esistente
        }
    } catch (err){
        return err
    }
}


const checkEmail = (len, users, newemail) =>{
    for (let i = 0; i<len; i++){
        if (users[i].email == newemail){
            return 0; //codice 0 = utente esiste già
        }
    }
    return 1; //utente non esiste ancora
}


//torna la lista di utenti
const getUser = async (emailToCheck) => {
    
    try{
        const database = client.db(dbName);
        const users = database.collection('users');
        const user = await users.findOne({"email": emailToCheck});
        return user;
    }catch (err){
        return err
    }
}

const verifyEmail = async (email) => {
    
    try {
        const database = client.db(dbName);
        const users = database.collection('users');
        const user = await users.findOne({ email: email });
        if (user == null) return 0
        if (user.verified == true){
            return 2
        }
        await users.updateOne({ email: email }, { $set: { verified: true } });
        return 1
    } catch (err) {
        console.error(err);
        return 0
    }
};

/* const getUserInfo = (identificatore) =>{ //identificatore: id o email, info: informazione da recuperare;
    const len = db.len;
    const users = db.users;
    if (typeof identificatore == "number") return users[i];
    for (let i = 0; i<len; i++){
        if (users[i].identificatore == emailToCheck){
            return users[i]; //codice 0 = utente esiste già
        }
    }
    return undefined;
} */

const verifyToken = (req, res, next) =>{
    const token = req.cookies['auth-token'];
    if(!token) return res.status(401).redirect('/');
    try{
        const verified = jwt.verify(token, secret);
        req.user = verified;
        next();
    }catch (err){
        res.status(400).redirect('/')
    }
}

const isLogged = (req) =>{
    const token = req.cookies['auth-token'];
    if(!token) return false;
    else return true
}

const userInfo = async (req) =>{ //ritorna tutte le informazioni dell'utente
    
    try{
        const database = client.db(dbName);
        const users = database.collection('users');
        const token = jwt.decode(req.cookies['auth-token']);
        const user = await users.findOne({"_id": new ObjectId(`${token.id}`)});
        return user;
    }catch (err){
        return err
    }
}

const getUsersId = async () => {
    try {
        const database = client.db(dbName);
        const collection = database.collection('automations');
        // Trova tutti i documenti e ottieni solo i user_id distinti
        const users = await collection.distinct("user_id");
        return users.map(user_id => ({ id: user_id }));
    } catch (error) {
        console.error('Error getting active users:', error);
        return [];
    }
};

const getProblems = async (userId) => {
    try {
        const database = client.db(dbName);
        const conflicts = database.collection('problems');
        const userConflicts = await conflicts.findOne({ 'user_id': userId });
        if (!userConflicts) return []; // Se non ci sono conflitti, restituisci un array vuoto
        return userConflicts['problems'];
    } catch (err) {
        console.log('error in db_methonds - getProblems');
        console.log(err);
        return err;
    }
};

const getAutomationsStates = async (userId) => {
    try {
        const database = client.db(dbName);
        const automations = database.collection('rules_state');
        const userAutomations = await automations.findOne({ 'user_id': userId });
        if (!userAutomations) return []; // Se non ci sono automazioni, restituisci un array vuoto
        return userAutomations['automation_data'];
    } catch (err) {
        console.log('error in db_methods - getAutomationsStates');
        console.log(err);
        return err;
    }
};

const getProblemsGoals = async (userId) => {
    try {
        const database = client.db(dbName);
        const conflictsGoal = database.collection('goals');
        const userConflictsGoal = await conflictsGoal.findOne({ 'user_id': userId });
        if (!userConflictsGoal) return []; // Se non ci sono conflitti, restituisci un array vuoto
        
        // Combine all goal types into a single array
        let allGoals = [];
        
        // Iterate through all possible goal types
        const goalTypes = ["security", "well-being", "energy", "health"];
        
        for (const goalType of goalTypes) {
            if (userConflictsGoal[goalType] && Array.isArray(userConflictsGoal[goalType])) {
                allGoals = allGoals.concat(userConflictsGoal[goalType]);
            }
        }
        
        return allGoals;
    } catch (err) {
        console.log('error in db_methonds - getProblemsGoal');
        console.log(err);
        return [];
    }
};

const getAutomations=async (userId) => {
    
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        const userAutomations = await automations.findOne({ 'user_id': userId }); // Sistemare nel caso non ci siano automazioni
        if (!userAutomations) return []; // Se non ci sono automazioni, restituisci null o un array vuoto
        return userAutomations['automation_data'];
    } catch (err) {
        console.log('error in getAutomationsByUserId');
        console.log(err);
        return []        
        //return err;
    }
};


const saveConfiguration = async (userId, data, auth) => {
    
    try {
        const database = client.db(dbName);
        const config = database.collection('config');
        if (config.findOne({ 'user_id': userId })) {
            await config.updateOne({ 'user_id': userId }, {$set: { 'config': data, 'auth': auth }}, { upsert: true });
        }else{
            await config.insertOne({ 'user_id': userId, 'config': data, 'auth': auth });
        }
       
    } catch (err) {
        console.log('error in saveConfiguration db_methods');
        console.log(err);
        return err;
    }
}

const getConfiguration = async (userId) => {
    
    try {
        const database = client.db(dbName);
        const config = database.collection('config');
        let conf = await config.findOne({ 'user_id': userId })
        if (conf) {
            return conf
        }else{
            return false
        }
       
    } catch (err) {
        console.log('error in getConfiguration db_methods');
        console.log(err);
        return err;
    }
}

const saveSelectedConfiguration = async (userId, data) => {
    
    try {
        const database = client.db(dbName);
        const config = database.collection('config');
        const query = {
            user_id: userId,
            'config': {
                $elemMatch: {
                    'e': { $in: data }
                }
            }
        };
       // Aggiungi proiezione per filtrare solo gli elementi corrispondenti
       const projection = {
        'selected': {
            $filter: {
                input: '$config',
                as: 'item',
                cond: { $in: ['$$item.e', data] }
            }
        }
    };

    const userConfig = await config.findOne(query, { projection });
    await config.updateOne({ 'user_id': userId }, { $set: { 'selected': userConfig.selected } }, { upsert: true });
    } catch (err) {
        console.log('error in saveSelectedConfiguration db_methods');
        console.log(err);
        return err;
    }
}



const saveAutomations = async (userId, automationsData) => {
    //saves all automations to DB
    
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        
        // Aggiorna o inserisce le automazioni per l'utente specificato
        await automations.updateOne(
            { 'user_id': userId },
            { 
                $set: { 
                    'user_id': userId,
                    'automation_data': automationsData
                }
            },
            { upsert: true }
        );
        return true;
    } catch (err) {
        console.log('error in saveAutomations');
        console.log(err);
        return false;
    }
};

const saveRulesStates= async (userId, automationsData) => {
    //saves all automations to DB
    
    try {
        const database = client.db(dbName);
        const automations_state = database.collection('rules_state');
        
        // Aggiorna o inserisce le automazioni per l'utente specificato
        await automations_state.updateOne(
            { 'user_id': userId },
            { 
                $set: { 
                    'user_id': userId,
                    'automation_data': automationsData
                }
            },
            { upsert: true }
        );
        return true;
    } catch (err) {
        console.log('error in saveRulesStates');
        console.log(err);
        return false;
    }
};

const saveAutomation = async (userId, automationId, config) => {
    //saves a single automation to DB
    
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        
        const userAutomations = await automations.findOne({ 'user_id': userId });
        
        if (userAutomations) {
            const automationIndex = userAutomations.automation_data.findIndex(
                auto => auto.id === automationId
            );
            
            const automationData = {
                id: automationId,
                state: 'on',
                config: config
            };
            
            if (automationIndex !== -1) {
                userAutomations.automation_data[automationIndex] = automationData;
            } else {
                userAutomations.automation_data.push(automationData);
            }
            
            await automations.updateOne(
                { 'user_id': userId },
                { $set: { 'automation_data': userAutomations.automation_data } }
            );
        }else{
            await automations.insertOne({
                'user_id': userId,
                'automation_data': [{ id: automationId, name: config['alias'],  config: config }]
            });
        }
        return true;
    } catch (err) {
        console.log('Errore in saveHAAutomation:', err);
        return false;
    }
};

const deleteRule = async (userId, ruleId, haDeleteFunc) => {
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        const problems = database.collection('problems');
        const goals = database.collection('goals');
        const rulesState = database.collection('rules_state');

        // elimina l'automazione dal database
        const userAutomations = await automations.findOne({ 'user_id': userId });
        
        if (!userAutomations) {
            return false;
        }

        const newAutomations = userAutomations.automation_data.filter(
            auto => {
                const match = auto.id.toString() !== ruleId.toString();
                return match;
            }
        );
                
        await automations.updateOne(
            { 'user_id': userId },
            { $set: { 'automation_data': newAutomations } }
        );

        // Elimina l'automazione dalla collezione rules_state
        const userRulesState = await rulesState.findOne({ 'user_id': userId });

        if (userRulesState && userRulesState.automation_data) {
            const filteredRulesState = userRulesState.automation_data.filter(
                rule => rule.id.toString() !== ruleId.toString()
            );
            
            await rulesState.updateOne(
                { 'user_id': userId },
                { 
                    $set: { 
                        'automation_data': filteredRulesState,
                        'last_update': new Date()
                    }
                }
            );
        }

        // Elimina i problemi che coinvolgono questa automazione
        const userProblems = await problems.findOne({ 'user_id': userId });
        
        if (userProblems && userProblems.problems) {          
            userProblems.problems.forEach((problem, index) => {
                if (problem.rules) {
                }
            });
            
            // Filtra i problemi che NON coinvolgono l'automazione eliminata
            const filteredProblems = userProblems.problems.filter(problem => {
                if (!problem.rules || !Array.isArray(problem.rules)) {
                    return true;
                }
                
                // Controlla se il problema coinvolge l'automazione eliminata
                const involvesDeletedRule = problem.rules.some(rule => {
                    const ruleIdStr = rule.id ? rule.id.toString() : '';
                    const targetIdStr = ruleId.toString();
                    const matches = ruleIdStr === targetIdStr;      
                    return matches;
                });
                
                if (involvesDeletedRule) {
                    return false; // Esclude questo problema
                }
                
                return true; // Mantiene questo problema
            });
            
            // Aggiorna la collezione problems
            const updateResult = await problems.updateOne(
                { 'user_id': userId },
                { 
                    $set: { 
                        'problems': filteredProblems,
                        'last_update': new Date()
                    }
                }
            );
            
        } 

        // Elimina i goals che coinvolgono questa automazione
        const userGoals = await goals.findOne({ 'user_id': userId });
        
        if (userGoals) {
            let goalsUpdated = false;
            const updatedGoals = {};
            
            // Itera attraverso ogni tipo di goal (energy, health, security, etc.)
            for (const [goalType, goalArray] of Object.entries(userGoals)) {
                if (goalType === '_id' || goalType === 'user_id' || goalType === 'created' || goalType === 'last_update') {
                    continue;
                }
                
                if (Array.isArray(goalArray)) {
                    // Filtra i goals che NON coinvolgono l'automazione eliminata
                    const filteredGoals = goalArray.filter(goal => {
                        if (!goal.rules || !Array.isArray(goal.rules)) {
                            return true;
                        }
                        
                        // Controlla se il goal coinvolge l'automazione eliminata
                        const involvesDeletedRule = goal.rules.some(rule => {
                            const ruleIdStr = rule.id ? rule.id.toString() : '';
                            const targetIdStr = ruleId.toString();
                            return ruleIdStr === targetIdStr;
                        });
                        
                        if (involvesDeletedRule) {
                            goalsUpdated = true;
                            return false; // Esclude questo goal
                        }
                        
                        return true; // Mantiene questo goal
                    });
                    
                    // Solo aggiungi il goalType se l'array non è vuoto
                    if (filteredGoals.length > 0) {
                        updatedGoals[goalType] = filteredGoals;
                    } else {
                        goalsUpdated = true; // Segna che è stato aggiornato perché abbiamo rimosso un array vuoto
                    }
                } else {
                    updatedGoals[goalType] = goalArray;
                }
            }
            
            // Aggiorna la collezione goals solo se ci sono stati cambiamenti
            if (goalsUpdated) {
                // Usa $unset per rimuovere completamente i campi che non sono in updatedGoals
                const fieldsToUnset = {};
                for (const [goalType, goalArray] of Object.entries(userGoals)) {
                    if (goalType !== '_id' && goalType !== 'user_id' && goalType !== 'created' && goalType !== 'last_update') {
                        if (Array.isArray(goalArray) && !updatedGoals.hasOwnProperty(goalType)) {
                            fieldsToUnset[goalType] = "";
                        }
                    }
                }
                
                const updateOperation = {
                    $set: {
                        ...updatedGoals,
                        'last_update': new Date()
                    }
                };
                
                // Aggiungi $unset solo se ci sono campi da rimuovere
                if (Object.keys(fieldsToUnset).length > 0) {
                    updateOperation.$unset = fieldsToUnset;
                }
                
                await goals.updateOne(
                    { 'user_id': userId },
                    updateOperation
                );
                
            }
        }
        
        // elimina l'automazione da Home Assistant
        const config = await getConfiguration(userId);
        
        if (!config || !config.auth) {
            return false;
        }
                
        const haResponse = await haDeleteFunc(config.auth.url, config.auth.token, ruleId);
        
        if (!haResponse) {
            return false;
        }
        return true;
        
    } catch (err) {
        console.log('Errore in deleteRule:', err);
        return false;
    }
}

async function updateAutomationState(userId, entity_id, is_running, entity_id_device, state_device) {
    try {
        const database = client.db(dbName);
        const rulesState = database.collection('rules_state');

        // Trova il documento dell'utente
        const userRulesState = await rulesState.findOne({ 'user_id': userId });
        
        if (!userRulesState || !userRulesState.automation_data) {
            return false;
        }
        
        // Trova l'indice dell'automazione con l'entity_id specificato
        const automationIndex = userRulesState.automation_data.findIndex(
            automation => automation.entity_id === entity_id
        );
        
        if (automationIndex === -1) {
            return false;
        }
        
        // Aggiorna l'automazione specifica usando l'approccio array completo
        const updatedAutomationData = [...userRulesState.automation_data];
        updatedAutomationData[automationIndex] = {
            ...updatedAutomationData[automationIndex],
            is_running: is_running,
            entity_id_device: entity_id_device,
            state_device: state_device,
            time: new Date().toISOString()
        };
        
        const updateResult = await rulesState.updateOne(
            { 'user_id': userId },
            { $set: { 'automation_data': updatedAutomationData } }
        );

        // Verifica l'aggiornamento
        const verifyUpdate = await rulesState.findOne({ 'user_id': userId });        
        return true;
        
    } catch (error) {
        console.error('Errore in updateAutomationState:', error);
        return false;
    }
}

async function closeDatabaseConnection() {
    if (client && client.topology && client.topology.isConnected()) {
        await client.close();
        console.log("Connessione a MongoDB chiusa.");
    }
}

const toggleAutomation = async (userId, automationId, state) => {
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        
        const userAutomations = await automations.findOne({ 'user_id': userId });
        
        if (!userAutomations) return false;
        
        const automationIndex = userAutomations.automation_data.findIndex(
            auto => auto.id.toString() === automationId.toString()
        );
        
        if (automationIndex === -1) return false; // Automazione non trovata
        
        userAutomations.automation_data[automationIndex].state = state;
        
        await automations.updateOne(
            { 'user_id': userId },
            { $set: { 'automation_data': userAutomations.automation_data } }
        );

        await updateAllProblemsState(userId);
        
        return true;
    } catch (err) {
        console.log('Errore in toggleAutomation:', err);
        return false;
    }
}

const ignoreProblem = async (userId, problemId) => {
    try {
        const database = client.db(dbName);
        const problems = database.collection('problems');
        
        const userProblems = await problems.findOne({ 'user_id': userId });
        
        if (!userProblems) return false;
        
        // Trova il problema e imposta ignored a true
        const updatedProblems = userProblems.problems.map(problem => {
            if (problem.id.toString() === problemId.toString()) {
                return { ...problem, ignore: true };
            }
            return problem;
        });
        
        // Aggiorna il documento con i problemi modificati
        await problems.updateOne(
            { 'user_id': userId },
            { $set: { 'problems': updatedProblems } }
        );
        
        return true;
    } catch (err) {
        console.log('Errore in ignoreProblem:', err);
        return false;
    }
};

const ignoreSuggestions = async (userId, suggestionId) => {
    try {
        const database = client.db(dbName);
        const suggestions = database.collection('improvement_solutions');
        const userSuggestions = await suggestions.findOne({ 'user_id': userId });

        if (!userSuggestions || !userSuggestions.solutions || !userSuggestions.solutions.recommendations) return false;

        let updated = false;

        // Scorri tutti i goal e tutte le raccomandazioni
        for (const goalKey of Object.keys(userSuggestions.solutions.recommendations)) {
            const recs = userSuggestions.solutions.recommendations[goalKey];
            if (Array.isArray(recs)) {
                for (const rec of recs) {
                    if (rec.unique_id === suggestionId) {
                        rec.ignore = true;
                        updated = true;
                    }
                }
            }
        }

        if (!updated) return false;

        // Aggiorna il documento nel database
        await suggestions.updateOne(
            { 'user_id': userId },
            { $set: { 'solutions': userSuggestions.solutions } }
        );

        return true;
    } catch (err) {
        console.log('Errore in ignoreSuggestions:', err);
        return false;
    }
};

const changeStateProblem = async (userId, problemId, newState = null) => {
    try {
        const database = client.db(dbName);
        const problems = database.collection('problems');
        const automations = database.collection('automations');
        
        const userProblems = await problems.findOne({ 'user_id': userId });
        const userAutomations = await automations.findOne({ 'user_id': userId });
        
        if (!userProblems || !userAutomations) {
            return false;
        }

        // Trova il problema specifico
        const targetProblem = userProblems.problems.find(problem => 
            problem.id.toString() === problemId.toString()
        );
        
        if (!targetProblem || !targetProblem.rules) {
            return false;
        }

        // Calcola lo stato automaticamente se non fornito
        let calculatedState = newState;
        
        if (calculatedState === null) {
            // Estrai gli ID delle automazioni coinvolte nel problema
            const ruleIds = targetProblem.rules.map(rule => rule.id.toString());
            
            // Trova gli stati delle automazioni coinvolte
            const involvedAutomations = userAutomations.automation_data.filter(automation => 
                ruleIds.includes(automation.id.toString())
            );
            
            const allStates = involvedAutomations.map(auto => auto.state || 'unknown');
            
            console.log(`Stati delle automazioni coinvolte:`, allStates);
            
            if (allStates.length === 0) {
                calculatedState = "unknown";
            } else if (allStates.every(state => state === "on")) {
                calculatedState = "on";
            } else if (allStates.some(state => state === "off")) {
                calculatedState = "off";
            } else {
                calculatedState = "partial";
            }
            
        }

        // Aggiorna il problema con il nuovo stato
        const updatedProblems = userProblems.problems.map(problem => {
            if (problem.id.toString() === problemId.toString()) {
                return { ...problem, state: calculatedState };
            }
            return problem;
        });
        
        // Salva nel database
        await problems.updateOne(
            { 'user_id': userId },
            { $set: { 'problems': updatedProblems } }
        );
        
        return { success: true, newState: calculatedState };
        
    } catch (err) {
        return false;
    }
};

const updateAllProblemsState = async (userId) => {
    try {
        const database = client.db(dbName);
        const problems = database.collection('problems');
        
        const userProblems = await problems.findOne({ 'user_id': userId });
        
        if (!userProblems || !userProblems.problems) {
            return { success: true, updatedCount: 0 };
        }

        let updatedCount = 0;
        
        // Aggiorna ogni problema automaticamente
        for (const problem of userProblems.problems) {
            if (problem.ignore === true || problem.solved === true) {
                continue;
            }
            
            const result = await changeStateProblem(userId, problem.id);
            if (result && result.success) {
                updatedCount++;
            }
        }
        
        return { success: true, updatedCount };
        
    } catch (err) {
        return false;
    }
};

const saveUserPreferences = async (userId, ranking) => {
    try {
        const database = client.db(dbName);
        const preferences = database.collection('user_preferences');
        
        await preferences.updateOne(
            { 'user_id': userId },
            { 
                $set: { 
                    'user_id': userId,
                    'ranking': ranking,
                    'last_update': new Date()
                }
            },
            { upsert: true }
        );
        return true;
    } catch (err) {
        console.log('error in saveUserPreferences');
        console.log(err);
        return false;
    }
};

const getUserPreferences = async (userId) => {
    try {
        const database = client.db(dbName);
        const preferences = database.collection('user_preferences');
        const userPreferences = await preferences.findOne({ 'user_id': userId });
        
        if (!userPreferences) {
            return { ranking: null }; // Ritorna null se non ci sono preferenze salvate
        }
        
        return { ranking: userPreferences.ranking };
    } catch (err) {
        console.log('error in getUserPreferences');
        console.log(err);
        return { ranking: null };
    }
};


const getImprovementSolutions = async (userId) => {
    try {
        const database = client.db(dbName);
        const improvements = database.collection('improvement_solutions');
        const userImprovements = await improvements.findOne({ 'user_id': userId });

        if (!userImprovements) {
            return []; // Ritorna un array vuoto se non ci sono miglioramenti salvati
        }

        return userImprovements['solutions'];
    } catch (err) {
        console.log('error in db_methonds getImprovementSolutions');
        console.log(err);
        return [];
    }
};

// const getHAAutomation = async (userId, automationId) => {
//     
//     try {
//         const database = client.db(dbName);
//         const automations = database.collection('automations');
        
//         const userAutomations = await automations.findOne({ 'user_id': userId });
        
//         if (!userAutomations) return null;
        
//         const automation = userAutomations.automation_data.find(
//             auto => auto.id.toString() === automationId.toString()
//         );
        
//         return automation ? {
//             id: automation.id,
//             name: automation.name,
//             config: automation.config
//         } : null;
//     } catch (err) {
//         console.log('Errore in getHAAutomation:', err);
//         return null;
//     } finally {
//         await client.close();
//     }
// };

module.exports = {
    setServerConfig,
    createUser,
    createGoogleUser,
    verifyToken,
    getUser,
    isLogged,
    userInfo,
    verifyEmail,
    getUsersId,
    getProblems,
    getProblemsGoals,
    getAutomationsStates,
    getAutomations,
    saveConfiguration,
    saveSelectedConfiguration,
    saveAutomations,
    saveAutomation,
    saveRulesStates,
    getConfiguration,
    deleteRule,
    updateAutomationState,
    closeDatabaseConnection,
    toggleAutomation,
    ignoreProblem,
    ignoreSuggestions,
    changeStateProblem,
    updateAllProblemsState,
    saveUserPreferences,
    getUserPreferences,
    getImprovementSolutions
};

