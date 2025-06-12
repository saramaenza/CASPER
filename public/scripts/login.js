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
        window.location.replace(base_link+"/casper")
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
    addEntryAnimations();
    enhanceInputAnimations();
    enhanceErrorMessages();

    // Enhance button hover effects
    document.querySelectorAll('.login-button, .forgot-password, .register-button').forEach(element => {
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 5px 15px rgba(0, 102, 255, 0.3)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
});

// Gestisce il click sul toggle tema
toggleSwitch.addEventListener('click', function() {
    //body.classList.toggle('dark');
    toggleSwitch.classList.toggle('dark');
    toggleBall.classList.toggle('dark');
});

// Aggiunge effetto hover con il mouse
toggleSwitch.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
});

toggleSwitch.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
});

// Funzione per impostare il tema
function setTheme(isDark = false) {
    const root = document.documentElement;
    const toggleSwitch = document.getElementById('toggleSwitch');
    const toggleBall = document.getElementById('toggleBall');
    
    if (isDark) {
        root.removeAttribute('data-theme');
        toggleSwitch.classList.add('dark');
        toggleBall.classList.add('dark');
    } else {
        root.setAttribute('data-theme', 'light');
        toggleSwitch.classList.remove('dark');
        toggleBall.classList.remove('dark');
    }
}

// Funzione per rilevare il tema di sistema e impostare il tema dell'app
function setSystemTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    function updateTheme(e) {
        const isDark = e.matches;
        setTheme(isDark);
    }
    
    // Imposta il tema iniziale in base alle preferenze di sistema
    updateTheme(prefersDark);
    
    // Ascolta i cambiamenti del tema di sistema
    prefersDark.addEventListener('change', updateTheme);
}

// Inizializza quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Imposta il tema iniziale basato sulle preferenze di sistema
    setSystemTheme();
    
    // Mantieni la funzionalità del toggle manuale
    document.getElementById('toggleSwitch').addEventListener('click', function() {
        const root = document.documentElement;
        const isDark = root.getAttribute('data-theme') === 'light';
        setTheme(isDark);
    });
});

function addEntryAnimations() {
    // Header animations
    const header = document.querySelector('.login-header');
    header.style.opacity = '0';
    header.style.transform = 'translateY(-20px)';

    // Form elements animations
    const formElements = document.querySelectorAll('.input-group, .form-options, .login-button, .register-link');
    formElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-20px)';
    });

    // Trigger animations after a short delay
    requestAnimationFrame(() => {
        header.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        header.style.opacity = '1';
        header.style.transform = 'translateY(0)';

        formElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            }, 100 * (index + 1));
        });
    });
}

// Enhance existing input animations
function enhanceInputAnimations() {
    document.querySelectorAll('.input-field').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02) translateY(-2px)';
            this.parentElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            this.parentElement.style.zIndex = '1';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1) translateY(0)';
            this.parentElement.style.zIndex = '0';
        });
    });
}

// Add error message animations
function enhanceErrorMessages() {
    const errContainer = document.querySelector('.error-info');
    errContainer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}