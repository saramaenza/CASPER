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
    const rememberMe = document.querySelector('.custom-checkbox').classList.contains('checked');

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
        if (rememberMe) {
            // Salva le credenziali nel localStorage
            localStorage.setItem('rememberedUser', JSON.stringify({
                email: email,
                password: btoa(password) // Codifica base64
            }));
        } else {
            // Rimuovi le credenziali se esistenti
            localStorage.removeItem('rememberedUser');
        }
        window.location.replace(base_link);
    } else {
        errContainer.classList.add('show');
        if(result.error === 'Invalid email/password') {
            errMessage.innerText = 'Email o password non validi';
        }
        if(result.error === 'Email verification needed') {
            errMessage.innerText = "Verifica la tua email per accedere";
        }
        
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

 // Password visibility toggle
function togglePassword() {
    const passwordField = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle i');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.className = 'far fa-eye-slash';
    } else {
        passwordField.type = 'password';
        toggleIcon.className = 'far fa-eye';
    }
}

// Modifica la funzione toggleRememberMe esistente
function toggleRememberMe() {
    const checkbox = document.querySelector('.custom-checkbox');
    checkbox.classList.toggle('checked');
    
    // Se deselezionato, rimuovi le credenziali salvate
    if (!checkbox.classList.contains('checked')) {
        localStorage.removeItem('rememberedUser');
    }
}

function checkRememberMe() {
    const savedUser = localStorage.getItem('rememberedUser');
    if (savedUser) {
        console.log('Credenziali salvate:', JSON.parse(savedUser));
        return true;
    }
    console.log('Nessuna credenziale salvata');
    return false;
}

 // Input focus animations
document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
        this.parentElement.style.transition = 'transform 0.3s ease';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Enhanced hover effects for interactive elements
document.querySelectorAll('.login-button, .forgot-password, .register-button').forEach(element => {
    element.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-1px)';
    });
    
    element.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key to submit (if focused on form elements)
    if (e.key === 'Enter' && (e.target.matches('.input-field'))) {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

// Dynamic background color based on time
function updateBackgroundBasedOnTime() {
    const hour = new Date().getHours();
    const body = document.body;
    
    if (hour >= 6 && hour < 12) {
        // Morning
        body.style.background = 'linear-gradient(135deg, #0A0B0F 0%, #1A1B23 50%, #0F1419 100%)';
    } else if (hour >= 12 && hour < 18) {
        // Afternoon
        body.style.background = 'linear-gradient(135deg, #0F1419 0%, #1A1B23 50%, #0A0B0F 100%)';
    } else {
        // Evening/Night
        body.style.background = 'linear-gradient(135deg, #0A0B0F 0%, #1A1B23 50%, #0F1419 100%)';
    }
}

// Aggiungi questa nuova funzione per caricare le credenziali salvate
function loadSavedCredentials() {
    const rememberedUser = localStorage.getItem('rememberedUser');
    
    if (rememberedUser) {
        const { email, password } = JSON.parse(rememberedUser);
        document.getElementById('email').value = email;
        document.getElementById('password').value = atob(password); // Decodifica base64
        document.querySelector('.custom-checkbox').classList.add('checked');
    }
}

// Aggiungi questo all'inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    loadSavedCredentials();
    updateBackgroundBasedOnTime();
});