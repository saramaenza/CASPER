const formLogin = document.getElementById('login')
formLogin.addEventListener('click', login)

const base_link = window.location.origin;

document.addEventListener("keydown", (event) => {
    if(event.key == 'Enter'){
        event.preventDefault();
        login(event);
      }
  })

const errContainer = document.querySelector('.error-info')
const errMessage = document.querySelector('.error-info h4')

async function login(event) {

    event.preventDefault();
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    const result = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            password
        })
    }).then((res) => {return res.json()})
    if (result.status === 'ok') {
        // everythign went fine
        //localStorage.setItem('token', result.data)
        //location.href = 'newPage.html';
        window.location.replace(base_link)
    } else {
        errContainer.style.visibility = 'initial'
        if(result.error === 'Invalid email/password') errMessage.innerText = '❗ Email o password non validi';
        if(result.error === 'Email verification needed') errMessage.innerText = "❗ Per effetturare l'accesso devi prima verificare la tua email";
        
    }
}
async function handleCredentialResponse(response) {
    // decodeJwtResponse() is a custom function defined by you
    // to decode the credential response.
    /* const responsePayload = decodeJwtResponse(response.credential);

    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email); */
    let result = await fetch('/googlelogin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: response.credential
        })
    }).then((res) => {return res.json()})
    if (result.status === 'ok') {
        window.location.replace(base_link+"/rulebot")
    }
 }