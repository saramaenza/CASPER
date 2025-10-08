import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import { dirname }from 'path';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import https from 'https';
import express, { response } from "express"
import fetch from "node-fetch"
import bodyParser from "body-parser"
import { createSession, createChannel } from "better-sse";
const nodemailer = require('nodemailer');
//LIBRARY PER MANDARE EVENTI AL CLIENT, USATO PRECEDENTEMENTE PER AGGIORNARE LA LISTA DI REGOLA QUANDO NE VENIVA SALVATA UNA NUOVA
/* const SSE = require('express-sse');
const sse = new SSE(); */

const app = express();
 // Funzione per selezionare la configurazione

//======== LOGIN/REG LIBRARIES ==========
const uuid = require('uuid');
const bcrypt = require('bcryptjs')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const {setServerConfig, createUser, getUser, verifyToken, isLogged, createGoogleUser, userInfo, verifyEmail, getAutomationsStates, getProblems, removeProblems, getUsersId, getProblemsGoals,getAutomations, getConfiguration, saveConfiguration,  saveSelectedConfiguration, saveAutomations,saveRulesStates,saveAutomation, deleteRule, closeDatabaseConnection, ignoreProblem, ignoreGoalProblem, ignoreSuggestions, deleteSuggestion, updateAutomationState, saveUserPreferences, getUserPreferences, getImprovementSolutions} = require('./db_methods.cjs');
const JWT_SECRET = 'sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk'
// =======================================
const { getEntities, getAutomationsHA, postAutomationHA, getEntitiesStates, getLogbook, toggleAutomation, deleteAutomation} = require('./utils.cjs');
const { selectConfig } = require('./config.cjs');
const configs = await selectConfig();
setServerConfig(configs); //imposta la configurazione del server in db_methods.cjs

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(express.static( __dirname + '/casper/public' ));
app.use("/casper", express.static( __dirname + '/public' ));
app.use(express.static('rules'));
app.use(cookieParser());

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'appid, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
  );
  res.setHeader('Connection', 'keep-alive');
  next();
});


//const rawData = fs.readFileSync('configs.json');
//const configs = JSON.parse(rawData)['grimilde']; //0 per giove, 1 per africa
const python_server = "http://127.0.0.1:8080"

const port = process.env.PORT || configs.port; //3500 || 443
let server = null;
if(configs.key_path != ""){
  const options = {
      key: fs.readFileSync(configs.key_path),
      cert: fs.readFileSync(configs.cert_path),
      ca: fs.readFileSync(configs.fullchain_path)
  };
  server = https.createServer(options, app);
}
else {
  server = app;
}

server.listen(port, () => {
  console.log('Server running on port ' + port);
  // Avvia il controllo periodico delle automazioni ogni 10 minuti
  startAutomationMonitoring();
});

//--- WEB PAGE + LOGIN + REGISTRAZIONE ---
const userIdMap = new Map();
const CLIENT_ID_WEB = "694797207083-f3lireaapl6ugqsddtfgm35qbnhl7ojs.apps.googleusercontent.com";
const {OAuth2Client} = require('google-auth-library');
const client_web = new OAuth2Client(CLIENT_ID_WEB);
async function verifyWeb(token) {
  const ticket = await client_web.verifyIdToken({
      idToken: token,  // <-- this comes from: conv.user.profile.token
      audience: CLIENT_ID_WEB,  // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  return payload;
}

// Funzione per avviare il monitoraggio delle automazioni
function startAutomationMonitoring() {
    const INTERVAL_MS = 60 * 10 * 1000; // 10 minuti in millisecondi
    
    //console.log('Avvio monitoraggio automazioni ogni 10 minuti...');
    
    setInterval(async () => {
        try {
            //console.log('Esecuzione controllo automazioni periodico...');
            await checkAllUsersAutomations();
            //await checkUserAutomations('6818c8ac24e5db8f9a0304e5'); // Per testare, controlla un utente specifico
        } catch (error) {
            console.error('Errore nel controllo periodico delle automazioni:', error);
        }
    }, INTERVAL_MS);
}

// Funzione per controllare le automazioni di tutti gli utenti
async function checkAllUsersAutomations() {
    try {
        // Recupera tutti gli id di tutti gli utenti che hanno una configurazione salvata
        const users = await getUsersId();
        for (const user of users) {
            console.log(`Controllo automazioni per l'utente: ${user.id}`);
            await checkUserAutomations(user.id);
        }
    } catch (error) {
        console.error('Errore nel controllo delle automazioni per tutti gli utenti:', error);
    }
}

// Funzione per controllare le automazioni di un singolo utente
async function checkUserAutomations(userId) {
    try {
        const conf = await getConfiguration(userId);
        if (!conf || !conf.auth) {
            console.log(`Configurazione non trovata per l'utente ${userId}`);
            return;
        }
        
        const { url, token } = conf.auth;
        const logbook = await getLogbook(url, token);
        
        if (logbook && logbook.length > 0) {
            await checkNotRunningAutomations(logbook, userId);
            await checkRunningAutomations(logbook, userId);
        }
    } catch (error) {
        console.error(`Errore nel controllo delle automazioni per l'utente ${userId}:`, error);
    }
}

async function checkNotRunningAutomations(logbook, userId) {
    try {
        // Chiama direttamente la funzione del database invece di fare una fetch
        const running_automations = await getAutomationsStates(userId);
        const onlyRunning = running_automations.filter(automation => automation.is_running);
        
        // Controlla se le automazioni in esecuzione sono ancora attive
        for (const automation of onlyRunning) {
            for (const element of logbook) {
                if (element.entity_id === automation.entity_id_device) {
                    if (element.state != automation.state_device) {
                        //console.log(`Automazione ${automation.entity_id} non è più in esecuzione`);
                        
                        // Chiama direttamente la funzione del database
                        const updateResult = await updateAutomationState(userId, automation.entity_id, false);
                        
                        if (!updateResult) {
                            console.error('Errore nell\'aggiornamento dello stato automazione:', automation.entity_id);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Errore in checkNotRunningAutomations:', error);
    }
}

async function checkRunningAutomations(logbook, userId) {
    try {
        // Controlla se le automazioni sono state attivate
        for (let index = 0; index < logbook.length; index++) {
            const element = logbook[index];
            
            if (element.entity_id && element.entity_id.startsWith('automation.') && 
                element.message && element.message.startsWith('triggered')) {
                
                let shouldAddToDb = true;
                
                if (index + 1 < logbook.length) {
                    const activatedDeviceName = logbook[index + 1].entity_id;
                    const activatedDeviceState = logbook[index + 1].state;
                    
                    if (logbook[index + 1].context_event_type == "automation_triggered") {
                        if (index + 2 < logbook.length) {
                            for (let j = index + 2; j < logbook.length; j++) {
                                if (logbook[j].entity_id === activatedDeviceName) {
                                    const newactivatedDeviceState = logbook[j].state;
                                    if (newactivatedDeviceState !== activatedDeviceState) {
                                        //console.log("NON SI AGGIUNGE", element.entity_id);
                                        shouldAddToDb = false;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (shouldAddToDb) {
                            //console.log("AGGIUNGERE AL DB", element.entity_id);
                            
                            // Chiama direttamente la funzione del database
                            const updateResult = await updateAutomationState(
                                userId, 
                                element.entity_id, 
                                true, 
                                activatedDeviceName, 
                                activatedDeviceState
                            );
                            
                            if (!updateResult) {
                                console.error('Errore nell\'aggiornamento dello stato automazione:', element.entity_id);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Errore in checkRunningAutomations:', error);
    }
}

app.get('/casper', (req, res) =>{
  if(!isLogged(req)) res.sendFile(path.join( __dirname, 'htdocs', 'index.html' ));
  else res.redirect('/casper/chat')
})

app.get('/casper/registration', (req, res) =>{
  //res.send("Registrazioni chiuse, contattare l'admin per avere un account.")
  res.sendFile(path.join( __dirname, 'htdocs', 'register.html' ));
})

app.post('/casper/login', async (req, res) => {
  const { email, password } = req.body
  if(!email || !password) return res.json({ status: 'error', error: 'Invalid email/password' })
  const user = await getUser(email);
	if (!user) {
		return res.json({ status: 'error', error: 'Invalid email/password' })
  }
  if (user.verified == false){
    return res.json({ status: 'error', error: 'Email verification needed' })
  }
  try {
    if (await bcrypt.compare(password, user.password)) {
      const session = uuid.v4();
      // the username, password combination is successful
      const token = jwt.sign(
        {
          id: user._id,
          session: session,
          name: user.name,
          email: user.email
        },
        JWT_SECRET,
        { expiresIn: "1 days" }
      )
      let CurrentDate = new Date()
       CurrentDate.setDate(CurrentDate.getDate() + 1)
      const cookieOptions = {
        /* httpOnly: true,*/
        secure: true, 
        expires: CurrentDate
        }
      res.cookie('auth-token', token, cookieOptions)
      userIdMap.set(session, user.id)
      //return res.redirect(200, '/rulebot')
      return res.json({ status: 'ok' })
    }
  } catch (error) {
    console.log(error);
  }
  res.json({ status: 'error', error: 'Invalid email/password' })
})

app.post('/casper/register', async (req, res) => {
	const { name, surname, password: plainTextPassword, email } = req.body
	/* if (!username || typeof username !== 'string') {
		return res.json({ status: 'error', error: 'Invalid username' })
  } */
  if (!name || name.length < 2) {
		return res.json({ status: 'error', error: 'Name too short' })
  }
  if (typeof name !== 'string') {
		return res.json({ status: 'error', error: 'Invalid name' })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.json({ status: 'error', error: 'Invalid email' })
  }
	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status: 'error', error: 'Invalid password' })
	}
	if (plainTextPassword.length < 5) {
		return res.json({
			status: 'error',
			error: 'Password too short. Should be atleast 6 characters'
		})
	}
	const password = await bcrypt.hash(plainTextPassword, 10)
	const response = await createUser(
    name,
    surname,
	  password,
	  email
	)
	if(response === 1) {
    //sendEmail(email)
    console.log('User created successfully: ', response)
  }
	else if (response === 0) {
		// duplicate key
		return res.json({ status: 'error', error: 'Email already in use' })
	}
	res.json({ status: 'ok' })
})

app.get('/casper/userInfo', verifyToken, async (req, res) =>{
  const info = await userInfo(req);
  res.send(info);
})

app.use('/casper/chat', verifyToken, (req, res) =>{
  const token = jwt.decode(req.cookies['auth-token']);
  if (!userIdMap.get(token.id)) userIdMap.set(token.session, token.id)
  res.clearCookie('chat_session_id');
  res.cookie('chat_session_id', uuid.v4())
  res.sendFile(path.join( __dirname, 'htdocs', 'casper.html' ));
  //next();
})
app.use('/casper/configuration', verifyToken, (req, res) =>{
  const token = jwt.decode(req.cookies['auth-token']);
  if (!userIdMap.get(token.id)) userIdMap.set(token.session, token.id)
  res.clearCookie('chat_session_id');
  res.cookie('chat_session_id', uuid.v4())
  res.sendFile(path.join( __dirname, 'htdocs', 'configuration.html' ));
  //next();
})

app.use('/casper/profile', verifyToken, (req, res) =>{
  const token = jwt.decode(req.cookies['auth-token']);
  if (!userIdMap.get(token.id)) userIdMap.set(token.session, token.id)
  res.sendFile(path.join( __dirname, 'htdocs', 'profile.html' ));
})

app.get('/casper/verification/:tag', async function(req, res) {
  let token = req.params.tag
  let email = jwt.decode(token)['email']
  let update = await verifyEmail(email)
  
  if (update == 1) res.send(`Email verified, go to: <a>${configs.base_url}</a> to login`)
  else if (update == 2) res.send(`Your email is already verified. Go to: <a>${configs.base_url}</a> to login`)
  else res.send("A error occurred during the mail verification")
});
// --- --- --- --- --- --- --- --- --- ---
app.get('/casper/reset_conv', verifyToken, (req, res) =>{
  
  res.clearCookie('chat_session_id');
  const convId = uuid.v4()
  res.cookie('chat_session_id', convId)
  res.json({status: 'ok', session_id: convId});
});

app.use('/casper/send_message', verifyToken, async (req, res) => {
  try {
    let user_id = req.body.user_id
    let session = req.body.session
    let text = req.body.text

    const body = {text: text, user_id: user_id, session: session};
    const response = await fetch(`${python_server}/send_message`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
    });
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.log('/casper/send_message error:', error.name);
    
    // Gestione semplice degli errori
    if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || 
        error.message.includes('fetch')) {
      return res.json({
        'text': 'Il chatbot è attualmente offline. Riprova più tardi.',
        'tokens': '0',
        'server_status': 'offline'
      });
    }
    
    // Altri errori
    res.json({
      'text': ':( Si è verificato un errore, puoi provare a rimandare l\'ultimo messaggio o scrivere \'riprova\'?',
      'tokens': '0',
      'server_status': 'error'
    });
  }
});

app.get('/casper/chatbot_status', async (req, res) => {
  try {
    const response = await fetch(`${python_server}/health`, {
      method: 'GET',
      timeout: 3000
    });
    
    res.json({
      status: response.ok ? 'Online' : 'Offline',

    });
  } catch (error) {
    res.json({
      status: 'Offline',

    });
  }
});

app.post('/casper/test_connection', async (req, res) => {
    const { url, token } = req.body;
    
    if (!url || !token) {
        return res.status(400).json({ 
            success: false, 
            message: 'URL e token sono richiesti' 
        });
    }
    
    try {
        const { testHomeAssistantConnection } = require('./utils.cjs');
        const isValid = await testHomeAssistantConnection(url, token);
        
        if (isValid) {
            res.json({ 
                success: true, 
                message: 'Connessione riuscita' 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Token non valido o Home Assistant non raggiungibile' 
            });
        }
    } catch (error) {
        console.error('Errore nel test di connessione:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore interno del server' 
        });
    }
});

app.use('/casper/get_goals_scores', async (req, res) => {
  try {
    let user_id = req.query.user_id;
    const response = await fetch(`${python_server}/get_quality_scores`, {
      method: 'POST',
      timeout: 3000,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({user_id: user_id})
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.log('/casper/get_goals_scores error:');
    console.log(error);
  }
});

app.use('/casper/load_devices', verifyToken, async (req, res) =>{
  try {
    let url = req.body.url
    let token = req.body.token
    let auth = {url: url, token: token}
    const entities = await getEntities(url, token);
    res.json(entities)
    if (entities) {
      saveConfiguration(req.body.userId, entities, auth)
    }
  } catch (error) {
    console.log('/casper/load_devices:')
    console.log(error)
  }
})

app.use('/casper/get_entities_states', verifyToken, async (req, res) => {
  try {
    let conf = await getConfiguration(req.query.id);
    if (!conf || !conf.auth) {
      return res.status(400).json({ error: 'Configuration or authentication not found for this user.' });
    }
    let url = conf.auth.url;
    let token = conf.auth.token;
    const entitiesStates = await getEntitiesStates(url, token, conf);
    res.json(entitiesStates);
  } catch (error) {
    console.log('/casper/get_entities_states:');
    console.log(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.use('/casper/load_logbook', verifyToken, async (req, res) =>{ 
  try {
    let url = req.body.url
    let token = req.body.token
    const logbook = await getLogbook(url, token);
    res.json(logbook)
  } catch (error) {
    console.log('/casper/load_logbook:')
    console.log(error)
  }
})

app.post('/casper/update_automation_state', verifyToken, async (req, res) => {
    try {
        const response = await updateAutomationState(req.body.userId, req.body.entity_id, req.body.is_running, req.body.entity_id_device, req.body.state_device);
        console.log("Response from updateAutomationState:", response);
        res.json(response);
    } catch (error) {
        console.error('Errore aggiornamento stato automazione:', error);
        res.status(500).json({ 
            error: 'Errore interno del server',
            details: error.message 
        });
    }
});

app.use('/casper/load_automations_running', verifyToken, async (req, res) =>{
  try {
    let userId = req.body.user_id
    const automations = await getAutomationsStates(userId);
    const onlyRunning = automations.filter(automation => automation.is_running);
    res.json(onlyRunning)
  } catch (error) {
    console.log('/casper/load_automations_running:')
    console.log(error)
  }
});

// Endpoint per rilevare problemi nelle automazioni
app.post('/casper/detect_problem', async (req, res) => {
  try {
    const { user_id, session_id, automations } = req.body;

    if (!user_id || !automations) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Chiamata al server Python per eseguire la funzione problem_detector
    const response = await fetch(`${python_server}/detect_problem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, session_id, automations }),
    });

    if (!response.ok) {
      throw new Error('Errore durante la chiamata al server Python');
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('/casper/detect_problem error:', error);
    res.status(500).json({ error: 'Errore interno del server', details: error.message });
  }
});

app.use('/casper/get_problems', verifyToken, async (req, res) => {
  try {
    let user_id = req.body.user_id;
    const data = await getProblems(user_id);
    res.json(data);
  } catch (error) {
    console.log('/casper/get_problems error:');
    console.log(error);
  }
}); 

app.use('/casper/remove_problems', verifyToken, async (req, res) => {
  try {
    let user_id = req.body.user_id;
    const result = await removeProblems(user_id);
    res.json(result);
  } catch (error) {
    console.log('/casper/remove_problems error:');
    console.log(error);
  }
});

app.use('/casper/load_automations', verifyToken, async (req, res) => {
  try {
    let url = req.body.url;
    let token = req.body.token;

    // Log per verificare i parametri ricevuti
    //console.log('URL ricevuto:', url);
    //console.log('Token ricevuto:', token);

    const automations = await getAutomationsHA(url, token);

    // Controlla se automations è null o undefined
    if (!automations || !Array.isArray(automations)) {
      console.error('Errore: automations non è un array valido:', automations);
      return res.status(500).json({ error: 'Errore nel caricamento delle automazioni' });
    }

    const cleanedAutomations = automations.map(automation => ({
      id: automation.id,
      entity_id: automation.entity_id,
      is_running: false,
      time: new Date().toISOString()
    }));

    res.json(automations);

    if (automations) {
      saveAutomations(req.body.userId, automations);
      saveRulesStates(req.body.userId, cleanedAutomations);
    }
  } catch (error) {
    console.log('/casper/load_automations:');
    console.log(error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.use('/casper/save_config', verifyToken, async (req, res) =>{
  try {
    const response = await saveSelectedConfiguration(req.body.userId, req.body.devices);
    res.json(response)
  } catch (error) {
    console.log('/casper/save_config error:')
    console.log(error)
  }
})

app.use('/casper/delete_rule', verifyToken, async (req, res) =>{
  try {
    const response = await deleteRule(req.body.id, req.body.rule_id, deleteAutomation);
    res.json(response)
  } catch (error) {
    console.log('/casper/delete_rule error:')
    console.log(error)
  }
})

app.use('/casper/save_automation', verifyToken, async (req, res) =>{
  try {
    let response = ''
    const db_response = await saveAutomation(req.body.userId, req.body.automationId, req.body.config);
    if (!db_response) response += 'Salvataggio su DB fallito.'
    else response += 'Salvataggio su DB ok.'
    let conf = await getConfiguration(req.body.userId)
    let url = conf.auth.url
    let token = conf.auth.token
    const ha_response = await postAutomationHA(url, token, req.body.automationId, req.body.config);
    if (!ha_response) response += 'Salvataggio su HomeAssistant fallito.'
    else response += 'Salvataggio su HomeAssistant ok.'
    //config = automation in JSOn
    res.json({status: response})
  } catch (error) {
    console.log('/casper/save_automation error:')
    console.log(error)
    return res.json(error)
  }
})

// Salva le preferenze utente
app.post('/casper/save_user_preferences', verifyToken, async (req, res) => {
    try {
        const { user_id, ranking } = req.body;
        const result = await saveUserPreferences(user_id, ranking);
        
        if (result) {
            res.json({ status: 'success' });
        } else {
            res.json({ status: 'error', error: 'Failed to save preferences' });
        }
    } catch (error) {
        console.log('/casper/save_user_preferences error:', error);
        res.json({ status: 'error', error: 'Internal server error' });
    }
});

// Recupera le preferenze utente
app.get('/casper/get_user_preferences', verifyToken, async (req, res) => {
    try {
        const user_id = req.query.user_id;
        const preferences = await getUserPreferences(user_id);
        res.json(preferences);
    } catch (error) {
        console.log('/casper/get_user_preferences error:', error);
        res.json({ ranking: null });
    }
});

// Recupera i miglioramenti suggeriti per l'utente basati sulle preferenze
app.get('/casper/get_improvement_solutions', verifyToken, async (req, res) => {
    try {
        const user_id = req.query.user_id;
        const solutions = await getImprovementSolutions(user_id);
        res.json(solutions);
    } catch (error) {
        console.log('/casper/get_improvement_solutions error:', error);
        res.json({ ranking: null });
    }
});

app.get('/casper/get_config', verifyToken, async (req, res) =>{
  try {
    const data = await getConfiguration(req.query.id);
    res.json(data)
  } catch (error) {
    console.log('/casper/get_config error:')
    console.log(error)
  }
})

app.use('/casper/get_rule_list', verifyToken, async (req, res) =>{
  try {
    let user_id = req.body.user_id
    const data = await getAutomations(user_id);
    res.json(data)
  } catch (error) {
    console.log('/casper/get_rule_list error:')
    console.log(error)
  }
})

app.use('/casper/get_goal_improvements', verifyToken, async (req, res) => {
  try {
    const { user_id } = req.body;
    // Chiama il server Python per generare i miglioramenti
    const response = await fetch(`${python_server}/get_goal_improvements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.log('/casper/get_goal_improvements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/casper/get_problems_goal', verifyToken, async (req, res) => {
  try {
    let user_id = req.body.user_id;
    const data = await getProblemsGoals(user_id);
    res.json(data);
  } catch (error) {
    console.log('/casper/get_problems error:');
    console.log(error);
  }
});

let ssesessions = new Map();
app.post('/casper/post_chat_state', async (req, res) =>{
  try {
    let body = {"action": req.body.action, "state": req.body.state, "id": req.body.id};
    const session_id = req.body.session_id;
    let session = ssesessions.get(session_id)
    session.push(body);
    res.json({status: 'ok'}) 
  } catch (error) {
    console.log('/casper/post_chat_state error:')
    console.log(error)
  }
})

app.post('/casper/toggle_automation', verifyToken, async (req, res) =>{
  try {
    const conf = await getConfiguration(req.body.userId)
    const ha_response = await toggleAutomation(
      conf.auth.url, 
      conf.auth.token,  
      req.body.automationId,
      req.body.automationEntityId, 
      req.body.userId);
    if (ha_response === false) {
      return res.json({status: 'error'});
    }else{
      return res.json({status: 'ok', state: ha_response});
    }
  } catch (error) {
    console.log('/casper/toggle_automation error:')
    console.log(error)
    return res.json({status: 'error'});
  }
});

app.post('/casper/ignore_problem', verifyToken, async (req, res) =>{
  try {
    const problemId = req.body.data.problemId;
    const userId = req.body.id;
    const response = await ignoreProblem(userId, problemId);
    if (response) {
      return res.json({status: 'ok'});
    } else {
      return res.json({status: 'error', message: 'Failed to ignore problem.'});
    }
  } catch (error) {
    console.log('/casper/ignore_problem error:')
    console.log(error)
    return res.json({status: 'error', message: 'An error occurred while ignoring the problem.'});
  }
});

app.post('/casper/ignore_goal_problem', verifyToken, async (req, res) =>{
  try {
    const goalProblemId = req.body.data.goalProblemId;
    const userId = req.body.id;
    const response = await ignoreGoalProblem(userId, goalProblemId);
    if (response) {
      return res.json({status: 'ok'});
    } else {
      return res.json({status: 'error', message: 'Failed to ignore goal problem.'});
    }
  } catch (error) {
    console.log('/casper/ignore_goal_problem error:')
    console.log(error)
    return res.json({status: 'error', message: 'An error occurred while ignoring the goal problem.'});
  }
});

app.post('/casper/ignore_suggestions', verifyToken, async (req, res) => {
  try {
    const suggestionId = req.body.data.suggestionId;
    const userId = req.body.id;
    const response = await ignoreSuggestions(userId, suggestionId);
    if (response) {
      return res.json({status: 'ok'});
    } else {
      return res.json({status: 'error', message: 'Failed to ignore suggestion.'});
    }
  } catch (error) {
    console.log('/casper/ignore_suggestions error:')
    console.log(error)
    return res.json({status: 'error', message: 'An error occurred while ignoring the suggestion.'});
  }
});

app.use('/casper/delete_suggestion', verifyToken, async (req, res) =>{
  try {
    const suggestionId = req.body.data.suggestionId;
    const userId = req.body.id;
    const response = await deleteSuggestion(userId, suggestionId);
    res.json(response)
  } catch (error) {
    console.log('/casper/delete_suggestion error:')
    console.log(error)
  }
})

 app.get('/casper/sse', async (req, res) =>{
  try {
    const session_id = req.cookies['chat_session_id'];
    const session = await createSession(req, res);
    if (!ssesessions.get(session_id)) ssesessions.set(session_id, session);
    session.push("Init");
  } catch (error) {
    console.log('/casper/sse error:')
    console.log(error)
  }
}) 
// Mappa per gestire i canali per sessione


//------ E-mail sender function ---------
const sendEmail = (destinatario) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
      auth: {
        user: 'hiislabiot@gmail.com',
        pass: 'kpto yaym itcy ampi'
      }
  });
  
  const token = jwt.sign(
    {
      email: destinatario,
    },
    JWT_SECRET,
    { expiresIn: "1 days" }
  )

  const mailOptions = {
    from: 'hiislabiot@gmail.com',
    to: destinatario,
    subject: 'RuleBot: Confirm your email',
    text: `Please click on the following link to verify your account ${configs.base_url}/casper/verification/${token}`
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}
//---------------------------------------
process.on('SIGINT', async () => {
    console.log("Ricevuto SIGINT. Chiusura dell'applicazione...");
    await closeDatabaseConnection();
    process.exit(0);
});