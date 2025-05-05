const formReg = document.getElementById('reg-form')
formReg.addEventListener('click', registerUser)

const errContainer = document.querySelector('.error-info')
const errMessage = document.querySelector('.error-info h4')

const password = document.querySelector("#password")
const confirmPassword = document.querySelector('#re-password')
let passCorrespond = false;

const base_link = window.location.origin;

/* Il controllo di corrispondenza tra le password è solo client-side, il che sporca la funzione registerUser */
confirmPassword.addEventListener("keyup", (event) => {
    if(password.value != confirmPassword.value){
        confirmPassword.style.borderColor = 'red'
        passCorrespond = false;
    }else{
        password.style.borderColor = 'green'
        confirmPassword.style.borderColor = 'green'
        passCorrespond = true;
    }
  })

document.addEventListener("keydown", (event) => {
    if(event.key == 'Enter'){
        event.preventDefault();
        registerUser(event);
      }
  })

async function registerUser(event) {
    event.preventDefault()
    const name = document.getElementById('name').value
    let surname = document.getElementById('surname').value
    const password = document.getElementById('password').value
    const email = document.getElementById('email').value

    if(surname == '') surname = null;
    if (!passCorrespond){
        errContainer.style.visibility = 'initial'
        errMessage.innerText = '❗ Le due password non corrispondono';
        return
    }
    const result = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            surname,
            password,
            email
        })
    }).then((res) => res.json())

    if (result.status === 'ok') {
        errContainer.style.visibility = 'initial'
        // everythign went fine
        //errContainer.setAttribute('style', 'background-color: #279f27s');
        errMessage.innerHTML = '✔ Registrazione avvenuta con successo.'
        //errMessage.innerHTML = '✔ Registrazione avvenuta con successo. </br> Conferma la tua mail per procedere con il login (controlla anche la cartella SPAM)'
        errContainer.style.backgroundColor = '#5a935a'
        errContainer.style.border = '3px solid #5a935a'
        setTimeout(() => {
            window.location.replace(base_link);
        }, 3000);
        
        /* alert('Success') */
    } else {
        errContainer.style.visibility = 'initial'
        if(result.error === 'Name too short') errMessage.innerText = '❗ Il nome inserito è troppo breve';
        if(result.error === 'Invalid name') errMessage.innerText = '❗ Il nome inserito non è valido. Prova senza lettere accentate';
        if(result.error === 'Invalid email') errMessage.innerText = "❗ L'indirizzo email inserito non è valido";
        if(result.error === 'Email already in use') errMessage.innerText = '❗ Email già in uso';
        if(result.error === 'Invalid password') errMessage.innerText = '❗ Password non valida';
        if(result.error === "Password too small. Should be atleast 6 characters") errMessage.innerText = '❗ Password troppo breve. Deve contenere almeno 6 caratteri'
        /* alert(result.error) */
    }
}