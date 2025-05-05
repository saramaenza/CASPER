const userList = "https://africa.isti.cnr.it/userlist"; //chiamata GET per avere la lista degli utenti
const userPost = "https://africa.isti.cnr.it/user"  //chiamata POST per inserire un nuovo utente
const ruleList = "https://africa.isti.cnr.it/rules" //chiamata GET per ricevere la lista delle regole
const changeRule = "https://africa.isti.cnr.it/changeRule" //chiamata POST per aggiornare le regole dopo il cancellamento 
const base_link = "https://africa.isti.cnr.it"
const currentUser = "https://africa.isti.cnr.it/currentUser"

console.log("script.js loaded");
const username = document.querySelector('#username');
const button = document.querySelector("#inizia");
const divSecond = document.querySelector(".second");
const divFirst = document.querySelector(".first");
const bot = document.querySelector('#chatHidden');
const usernameView = document.querySelector("p.user");
const ul = document.querySelector(".ruleList");
const downButton = document.querySelector("#download");
const aggiorna = document.querySelector("#aggiorna");
const changeUser = document.querySelector("#changeUser");

//setta l'user ID come parametro dell'elemento HTML del chatbot. Serve per recuperare il nome utente lato server
/* function setID(userID, sessionID){
  //bot.setAttribute('user-id', userID);
  let data = {
    "userID": userID ,
    "sessionID": sessionID
  }
  postData(data, currentUser);
} */

//setto gli stili dopo il login
/* function logDone(userID){
  divFirst.style.display = "none";
  divSecond.style.display = "flex";
  usernameView.innerHTML = userID;
} */
//stampa la lista delle regole per l'utente loggato
async function getUserRule(rules){
  let size = Object.keys(rules).length;
  while(ul.firstChild){
    ul.removeChild(ul.firstChild );
  }
  if (size === 0){
    let p = document.createElement("p");
    p.appendChild(document.createTextNode("Ancora nessuna regola..."));
    ul.appendChild(p);
  } else {
    for (let i = 0; i < size; i++){
        let sentence = clientSentencer(rules[i]);
        let div = document.createElement('div');
        div.classList.add('rule');
        let li = document.createElement("li");
        //li.id = rules[i].number;
        let deleteImg = document.createElement('IMG');
        deleteImg.id = rules[i].number
        deleteImg.src='./img/delete.svg';
        deleteImg.classList.add('deleteImg');
        li.appendChild(document.createTextNode(sentence));
        div.appendChild(deleteImg);
        div.appendChild(li);
        ul.appendChild(div);
    }
  }
}
//cancella una regola dalla lista
async function deleteRule(id, obj){
  let size = Object.keys(obj).length;
  let tmp;
  
  for (let i = 0; i<size; i++){
  
    if (obj[i].number == id){
      tmp = i;
    }
  }
  obj.splice(tmp, 1);
  document.getElementById(`${id}`).parentElement.remove();
  let newsize = Object.keys(obj).length;
  for (let i = 0; i<newsize; i++){
    obj[i].number = i+1; 
  }
  postData(obj, changeRule);
}
//prende i vari "pezzi di frasi" associati ai trigger e alle azioni e li lega in un'unica frase
function clientSentencer(obj){
  let tSize = Object.keys(obj.rule.triggers).length; //lunghezza lista trigger
  let aSize = Object.keys(obj.rule.actions).length; //lunghezza lista action
  let tSentence = "";
  let aSentence = "";
  let final = "";
  for (let i = 0; i < tSize; i++){
    tSentence = tSentence + obj.rule.triggers[i].sentence;
  }
  for (let i = 0; i < aSize; i++){
    if(aSize<=1){
      aSentence = obj.rule.actions[i].sentence;
    }else{
      if(i === aSize-2) aSentence = aSentence + obj.rule.actions[i].sentence
      else aSentence =  obj.rule.actions[i].sentence +", "+ aSentence;
    }
  }
  final =  `${tSentence}, ${aSentence}.`;
  fianl = final.replace(/  +/g, ' ');
  final = final.charAt(0) + final.substring(1).toLowerCase();
  return final;
}

//controlla se un utente è presente nella lista utenti
/* function userInList(user, list){
  let trovato = false;
  for (const [key, value] of Object.entries(list)) {
    if(user === value) return true;
  }
  return trovato;
} */

//--------------------POST & GET FUNCTION----------------------------------
//effettua POST generici verso il server
async function postData(data, url) {
  let user = username.value.toLowerCase()
  fetch(url, {
    method: "post",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data,
      user
    })
  })
  .then((response) => { 
    //console.log(response);
  });
}

//effettua GET generici dal server
async function getData(url) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

//ritorna le regole per ogni utente
async function getRulesParam(url, user){
  const response = await fetch(`${url}?id=${user}`);
  if(response.status === 200){
    const data = await response.json();
    return data;
  }else{
    return {};
  }
}

/*function getCookie(){
  const cookieValue = document.cookie
  .split('; ')
  .find(row => row.startsWith('user'));
  return cookieValue;
}*/
//------------------------------------------------------------------------------

/*window.addEventListener("load", ()=>{
  const cookieValue = getCookie();
  console.log(cookieValue);
  if(cookieValue !== undefined || cookieValue !== "user=false"){
    console.log(document.cookie);
    let cookie = cookieValue.split('=')[1];
    username.value = cookie;
    button.click();
  }
})*/

/*changeUser.addEventListener("click", () => {
  document.cookie = `user=false`;
  location.reload();
  console.log(document.cookie);
})*/

//cancella una regola dalla lista 
document.querySelector('.regole').addEventListener('click', async (e)=>{
  const userValue = username.value.toLowerCase();
  if (e.target.nodeName === 'IMG'){
    if (userValue){
    let rulesList = await getRulesParam(ruleList, userValue);
    let element = e.target;
    let id = element.id;
  
    deleteRule(id, rulesList);
    }
  }
});

//-------------------- Funzione per loggare, richiamata al click del bottone "login" o alla pressione del tasto "Enter"------------------
import jwt_decode from "./jwt-decode";
const lang = Cookies.get("lang");
const tokenRaw = Cookies.get("auth_token");
const token = jwt_decode(token);

async function logIn(){ // 'rulebot.html.onload();
  const userValue = username.value.toLowerCase(); //valore inputbox client
  //document.cookie = `user=${userValue}`;
  if (userValue){
    let [usersList, rulesList] = await Promise.all([getData(userList), getRulesParam(ruleList, userValue)]);
    let users = usersList.users; //lista utenti
    
    getUserRule(rulesList);

  //controlli sull'username (se esiste ecc..)
    setID(userValue, bot.getAttribute('session-id')); //setto il nome utente come id di dialogflow
    logDone(userValue); //gestisco gli stili di index.html

    if (userInList(userValue, users) === false){
      postData(userValue, userPost);
    };
    
    if (lang == 'en'){
      getBotResponse('hello my dear');
      generateTypingMsg('bot');
    }else{
      getBotResponse('ciao');
      generateTypingMsg('bot');
    }
    
    
  }else{
    username.style.border="1px solid red";
  }
}


document.addEventListener("keydown", (event) => {
  if(divFirst.style.display != 'none'){
    if(event.key == 'Enter'){
      event.preventDefault();
      logIn();
    }
  }
})
button.addEventListener("click", () => {
  logIn();
});
//-----------------------------------------------------------------------

//aggiorna la lista delle regole
aggiorna.addEventListener("click", async () => {
  const userValue = username.value.toLowerCase(); //valore inputbox client
  let rulesList = await getRulesParam(ruleList, userValue);
  getUserRule(rulesList)
});

//scarica il JSON contenente le regole
downButton.addEventListener("click", ()=>{
  let link = document.createElement("a");
  let reg = /^(.+?)@/;
  let name = `${username.value.toLowerCase()}`;
  let newName;
  try {
    newName = name.match(reg)[1];
    link.download = `${newName}.json`;
    link.href = `${base_link}/${username.value.toLowerCase()}.json`;
  } catch (error) {
    link.download = `${username.value.toLowerCase()}`;
    link.href = `${base_link}/${username.value.toLowerCase()}.json`;
  }
  link.click();
})


// ------------modifica lo stile della chat----------------
/* function setDimension (icon){
  let dfIcon = document.querySelector("#chatHidden").shadowRoot.querySelector("#widgetIcon");
  let chat = document.querySelector("#chatHidden").shadowRoot.querySelector("div > df-messenger-chat").shadowRoot.querySelector("div");
  let w = window.innerWidth;
  dfIcon.style.setProperty("transform", "scale(1.3)");
  if (icon) dfIcon.style.right = `${(w/4)-56}px`;
  if(w >= 500){
    setTimeout(() => {
      chat.style.right = `${(w/4)-56}px`;
      chat.style.transform = `translate3d(130px, 0px, 0px) scale(1, 1)`;
    }, 100);
  }
}

const dfMessenger = document.querySelector('df-messenger');
dfMessenger.addEventListener('click', function (event) {
  setDimension(false);
});

window.addEventListener('resize', () => {
  setDimension(true);
})

window.addEventListener('dfMessengerLoaded', function (event) {
  let input = document.querySelector("#chatHidden").shadowRoot.querySelector("div > df-messenger-chat").shadowRoot.querySelector("div > df-messenger-user-input").shadowRoot.querySelector("div > div.input-box-wrapper > input[type=text]")
  input.placeholder="Digita qui il tuo input...";
  setDimension(true)
  let icon = document.querySelector("#chatHidden").shadowRoot.querySelector("#widgetIcon > div.df-chat-icon.default.show");
  icon.innerHTML="";
  let elem = document.createElement("img");
  elem.src = './img/icon.png';
  elem.style.width="100%";
  icon.appendChild(elem);
}); */

// --------------------------------------------------------
