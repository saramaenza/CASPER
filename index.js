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
const {setServerConfig, createUser, getUser, verifyToken, isLogged, createGoogleUser, userInfo, verifyEmail, getProblems, getAutomations, getConfiguration, saveConfiguration,  saveSelectedConfiguration, saveAutomations, saveAutomation, deleteRule } = require('./db_methods.cjs');
const JWT_SECRET = 'sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk'
// =======================================
const { getEntities, getAutomationsHA, postAutomationHA } = require('./utils.cjs');
const { selectConfig } = require('./config.cjs');
const configs = await selectConfig();
setServerConfig(configs); //imposta la configurazione del server in db_methods.cjs

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static( __dirname + '/public' ));
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
//C:/Certbot/live/africa.isti.cnr.it/
//C:/Certbot/live/giove.isti.cnr.it-0001/
//const server = https.createServer(options, app);

server.listen(port, () => console.log('Server running on port ' + port));

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


app.get('/policy', (req, res) =>{
  res.sendFile(path.join( __dirname, 'htdocs', 'privacyPolicy.html' ));
})

app.post('/googlelogin', async (req, res) =>{
  const payload = await verifyWeb(req.body.token);
  const user = await createGoogleUser(payload, true);
  //console.log(user); //ritorna l'id dell'utente nel DB, a prescindere che crei un nuovo record o che recuperi un account esistente
  const session = uuid.v4();
      // the username, password combination is successful
  const token = jwt.sign(
    {
      id: user.id,
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
  return res.json({ status: 'ok' })
})


app.get('/', (req, res) =>{
  if(!isLogged(req)) res.sendFile(path.join( __dirname, 'htdocs', 'index.html' ));
  else res.redirect('/rulebot')
})

app.get('/registration', (req, res) =>{
  //res.send("Registrazioni chiuse, contattare l'admin per avere un account.")
  res.sendFile(path.join( __dirname, 'htdocs', 'register.html' ));
})

app.post('/login', async (req, res) => {
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

app.post('/register', async (req, res) => {
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

app.get('/userInfo', verifyToken, async (req, res) =>{
  const info = await userInfo(req);
  res.send(info);
})

app.use('/rulebot', verifyToken, (req, res) =>{
  const token = jwt.decode(req.cookies['auth-token']);
  if (!userIdMap.get(token.id)) userIdMap.set(token.session, token.id)
  res.clearCookie('chat_session_id');
  res.cookie('chat_session_id', uuid.v4())
  res.sendFile(path.join( __dirname, 'htdocs', 'rulebot.html' ));
  //next();
})
app.use('/configuration', verifyToken, (req, res) =>{
  const token = jwt.decode(req.cookies['auth-token']);
  if (!userIdMap.get(token.id)) userIdMap.set(token.session, token.id)
  res.clearCookie('chat_session_id');
  res.cookie('chat_session_id', uuid.v4())
  res.sendFile(path.join( __dirname, 'htdocs', 'configuration.html' ));
  //next();
})

app.use('/profile', verifyToken, (req, res) =>{
  const token = jwt.decode(req.cookies['auth-token']);
  if (!userIdMap.get(token.id)) userIdMap.set(token.session, token.id)
  res.sendFile(path.join( __dirname, 'htdocs', 'profile.html' ));
})

app.get('/verification/:tag', async function(req, res) {
  let token = req.params.tag
  let email = jwt.decode(token)['email']
  let update = await verifyEmail(email)
  
  if (update == 1) res.send(`Email verified, go to: <a>${configs.base_url}</a> to login`)
  else if (update == 2) res.send(`Your email is already verified. Go to: <a>${configs.base_url}</a> to login`)
  else res.send("A error occurred during the mail verification")
});
// --- --- --- --- --- --- --- --- --- ---

app.use('/send_message', verifyToken, async (req, res) =>{
  let data = {}
  try {
    let user_id = req.body.user_id
    let session = req.body.session
    let text = req.body.text

    const body = {text: text, user_id: user_id, session: session};
    const response = await fetch(`${python_server}/send_message`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'}
    });
    data = await response.json();
    res.json(data)
    
  } catch (error) {
    console.log('/send_message error:')
    console.log(error)
    let resp = {}
    resp['content'] = ":( Si è verificato un errore, puoi provare a rimandare l'ultimo messaggio o scrivere 'riprova'? Se l'errore persiste, per favore riprova più tardi."
    res.json({'text': resp['content'], 'tokens': [-1, -1]})
  }
})

app.use('/load_devices', verifyToken, async (req, res) =>{
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
    console.log('/load_devices:')
    console.log(error)
  }
})

app.use('/load_automations', verifyToken, async (req, res) =>{
  try {
    let url = req.body.url
    let token = req.body.token
    const automations = await getAutomationsHA(url, token);
    res.json(automations)
    if (automations) {
      saveAutomations(req.body.userId, automations)
    }
  } catch (error) {
    console.log('/load_automations:')
    console.log(error)
  }
})

app.use('/save_config', verifyToken, async (req, res) =>{
  try {
    const response = await saveSelectedConfiguration(req.body.userId, req.body.devices);
    res.json(response)
  } catch (error) {
    console.log('/save_config error:')
    console.log(error)
  }
})


app.use('/delete_rule', verifyToken, async (req, res) =>{
  try {
    const response = await deleteRule(req.body.id, req.body.rule_id);
    res.json(response)
  } catch (error) {
    console.log('/delete_rule error:')
    console.log(error)
  }
})

app.use('/save_automation', verifyToken, async (req, res) =>{
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
    console.log('/save_automation error:')
    console.log(error)
    return res.json(error)
  }
})

app.get('/get_config', verifyToken, async (req, res) =>{
  try {
    const data = await getConfiguration(req.query.id);
    res.json(data)
  } catch (error) {
    console.log('/get_config error:')
    console.log(error)
  }
})

app.use('/get_rule_list', verifyToken, async (req, res) =>{
  try {
    let user_id = req.body.user_id
    const data = await getAutomations(user_id);
    res.json(data)
  } catch (error) {
    console.log('/get_rule_list error:')
    console.log(error)
  }
})

app.get('/get_problems', verifyToken, async (req, res) => {
  try {
    let user_id = req.query.id;
    const data = await getProblems(user_id);
    res.json(data);
  } catch (error) {
    console.log('/get_problems error:');
    console.log(error);
  }
});

let ssesessions = new Map();
app.post('/post_chat_state', async (req, res) =>{
  try {
    let body = {"action": req.body.action, "state": req.body.state, "id": req.body.id};
    const session_id = req.body.session_id;
    let session = ssesessions.get(session_id)
    session.push(body);
    res.json({status: 'ok'}) 
  } catch (error) {
    console.log('/get_chat_state error:')
    console.log(error)
  }
})


 app.get('/sse', async (req, res) =>{
  try {
    const session_id = req.cookies['chat_session_id'];
    const session = await createSession(req, res);
    if (!ssesessions.get(session_id)) ssesessions.set(session_id, session);
    session.push("Init");
  } catch (error) {
    console.log('/init_chat_state error:')
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
    text: `Please click on the following link to verify your account ${configs.base_url}/verification/${token}`
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