const fs = require('fs');
//const db = require('./db.json');
const jwt = require('jsonwebtoken')
const secret = 'sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk'
const { MongoClient, ObjectId } = require("mongodb");
const path = require('path');
const serverConfig = fs.readFileSync('configs.json');
const dbName = JSON.parse(serverConfig)['grimilde']['db_name'];
const uri =
  "mongodb://127.0.0.1:27017";


//crea nuovo utente e lo mette nel db
const createUser = async (name,surname,pass,email) =>{
	const client = new MongoClient(uri);
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
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

const createGoogleUser = async (payload, fullInfo) =>{
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
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
    const client = new MongoClient(uri);
    try{
        const database = client.db(dbName);
        const users = database.collection('users');
        const user = await users.findOne({"email": emailToCheck});
        return user;
    }catch (err){
        return err
    } finally {
        await client.close();
    }
}

const verifyEmail = async (email) => {
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
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
    const client = new MongoClient(uri);
    try{
        const database = client.db(dbName);
        const users = database.collection('users');
        const token = jwt.decode(req.cookies['auth-token']);
        const user = await users.findOne({"_id": new ObjectId(`${token.id}`)});
        return user;
    }catch (err){
        return err
    } finally {
        await client.close();
    }
}

const fakeInit = async (userId) => {
    try{
        await saveConfiguration(userId, fake_config, fake_auth);
        await saveSelectedConfiguration(userId, fake_selected);
        await saveAutomations(userId, fake_automations);
    }catch (err){
        console.log('error in initUserData')
        console.log(err)
        return err
    }
}

/*const initUserData = async (userId) =>{
    const client = new MongoClient(uri);
    try{
        const database = client.db(dbName);
        const conflicts = database.collection('conflicts');
        const automations = database.collection('automations');
        const goals = database.collection('goals');
        //read JSON file and insert data into db
        
        let conflicts_data = fs.readFileSync(path.join(__dirname, 'gpt_server', 'data', 'conflict.json'));
        let automations_data = fs.readFileSync(path.join(__dirname, 'gpt_server', 'data', 'automation.json'));
        let goal_data = fs.readFileSync(path.join(__dirname, 'gpt_server', 'data', 'goal_conflict.json'));
        //mongo entry for conflicts and userid
        let conflicts_entry = JSON.parse(conflicts_data);
        await conflicts.insertOne({'user_id':userId, 'conflict_data': conflicts_entry});
        //mongo entry for automations and userid
        let automations_entry = JSON.parse(automations_data);
        await automations.insertOne({'user_id':userId, 'automation_data': automations_entry});

        let goal_entry = JSON.parse(goal_data);
        await goals.insertOne({'user_id':userId, 'goal_data': goal_entry});
        return 1;
    }catch (err){
        console.log('error in initUserData')
        console.log(err)
        return err
    } finally {
        await client.close();
    }
}*/


const getConflicts = async (userId) => {
    const client = new MongoClient(uri);
    try {
        const database = client.db(dbName);
        const conflicts = database.collection('conflicts');
        const userConflicts = await conflicts.findOne({ 'user_id': userId });
        return userConflicts['conflict_data'];
    } catch (err) {
        console.log('error in getConflictsByUserId');
        console.log(err);
        return err;
    } finally {
        await client.close();
    }
};

const getAutomations=async (userId) => {
    const client = new MongoClient(uri);
    console.log("QUA")
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        const userAutomations = await automations.findOne({ 'user_id': userId });
        return userAutomations['automation_data'];
    } catch (err) {
        console.log('error in getAutomationsByUserId');
        console.log(err);
        return []        
        //return err;
    } finally {
        await client.close();
    }
};

const getGoals = async (userId) => {
    const client = new MongoClient(uri);
    try {
        const database = client.db(dbName);
        const goals = database.collection('goals');
        const userGoals = await goals.findOne({ 'user_id': userId });
        return userGoals['goal_data'];
    } catch (err) {
        console.log('error in getGoalsByUserId');
        console.log(err);
        return err;
    } finally {
        await client.close();
    }
};

const restoreProblem = async (problemId, userId) => {

    let goals = await getGoals(userId);
    let conflicts = await getConflicts(userId);
    
    /* let goal = goals.find(g => g.id == problemId);
    let conflict = conflicts.find(c => c.id == problemId); */
    let found = null;
    if (goals) {
        let new_list = [];
        goals.forEach(element => {
            if (element.id == problemId) {
                element.solved = false;
                new_list.push(element);
                found = true;
            }else{
                new_list.push(element);
            }
        });
        if (found) {
            const client = new MongoClient(uri);
            try {
                const database = client.db(dbName);
                const goals = database.collection('goals');
                await goals.replaceOne({ 'user_id': userId }, { 'user_id': userId, 'goal_data': new_list } );
            } catch (err) {
                console.log('error in restoreProblem goals');
                console.log(err);
                return err;
            } finally {
                await client.close();
            }
        }
    }
    if (conflicts && !found) {
        let new_list = [];
        conflicts.forEach(element => {
            if (element.id == problemId) {
                element.solved = false;
                new_list.push(element);
                found = true;
            }else{
                new_list.push(element);
            }
        });
        if (found) {
            const client = new MongoClient(uri);
            try {
                const database = client.db(dbName);
                const conflicts = database.collection('conflicts');
                await conflicts.replaceOne({ 'user_id': userId }, { 'user_id': userId, 'conflict_data': new_list } );
            } catch (err) {
                console.log('error in restoreProblem conflicts');
                console.log(err);
                return err;
            } finally {
                await client.close();
            }
        }
    }
    return found;
}

const saveConfiguration = async (userId, data, auth) => {
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
    }
}

const getConfiguration = async (userId) => {
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
    }
}

const saveSelectedConfiguration = async (userId, data) => {
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
    }
}



const saveAutomations = async (userId, automationsData) => {
    //saves all automations to DB
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
    }
};

const saveAutomation = async (userId, automationId, config) => {
    //saves a single automation to DB
    const client = new MongoClient(uri);
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
    } finally {
        await client.close();
    }
};

const deleteRule = async (userId, ruleId) => {
    const client = new MongoClient(uri);
    try {
        const database = client.db(dbName);
        const automations = database.collection('automations');
        
        const userAutomations = await automations.findOne({ 'user_id': userId });
        
        if (!userAutomations) return false;
        
        const newAutomations = userAutomations.automation_data.filter(
            auto => auto.id.toString() !== ruleId.toString()
        );
        await automations.updateOne(
            { 'user_id': userId },
            { $set: { 'automation_data': newAutomations } }
        );
        
        return true;
    } catch (err) {
        console.log('Errore in deleteHAAutomation:', err);
        return false;
    } finally {
        await client.close();
    }
}


// const getHAAutomation = async (userId, automationId) => {
//     const client = new MongoClient(uri);
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
    createUser,
    createGoogleUser,
    verifyToken,
    getUser,
    isLogged,
    userInfo,
    verifyEmail,
    getConflicts,
    getAutomations,
    getGoals,
    restoreProblem,
    saveConfiguration,
    saveSelectedConfiguration,
    saveAutomations,
    saveAutomation,
    getConfiguration,
    deleteRule
};

