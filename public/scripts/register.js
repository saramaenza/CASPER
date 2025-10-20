const formReg = document.getElementById('reg-form')
formReg.addEventListener('click', registerUser)

const errContainer = document.querySelector('.error-info')
const errMessage = document.querySelector('.error-info h4')

const password = document.querySelector("#password")
const confirmPassword = document.querySelector('#re-password')
let passCorrespond = false;

const base_link = window.location.origin;


document.addEventListener("keydown", (event) => {
    if(event.key == 'Enter'){
        event.preventDefault();
        registerUser(event);
      }
  })

// register form submit handler
async function registerUser(event) {
    event.preventDefault();
    const loadingOverlay = document.querySelector('.loading-overlay');
    const messageOverlay = document.querySelector('.message-overlay');
    const messageBox = messageOverlay.querySelector('.message-box');
    const messageText = messageBox.querySelector('h3');
    // Show loading spinner
    loadingOverlay.style.display = 'flex';

    const name = document.getElementById('name').value
    let surname = document.getElementById('surname').value
    const password = document.getElementById('password').value
    const email = document.getElementById('email').value

    if(surname == '') surname = null;
    const result = await fetch('/casper/register', {
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

    loadingOverlay.style.display = 'none';

    if (result.status === 'ok') {
        generateDialogReg(
            "success",
            "Registrazione completata",
            "La registrazione è avvenuta con successo",
            () => {
                // Callback per il pulsante "OK"
                window.location.replace(base_link+"/casper");
            }
        );
        return; 
    } else {
        // Usa generateDialogReg per mostrare il error-dialog
        generateDialogReg(
            "error",
            "Errore durante la registrazione",
            "Qualcosa è andato storto. L'email potrebbe essere già registrata o si è verificato un problema temporaneo con il server. Ti invitiamo a riprovare.",
            async () => {}
        );

        return; // Interrompi l'esecuzione
    }
}

// Password visibility toggle
function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const toggleIcon = passwordField.nextElementSibling;
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.innerHTML = '<i class="far fa-eye-slash"></i>';
    } else {
        passwordField.type = 'password';
        toggleIcon.innerHTML = '<i class="far fa-eye"></i>';
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let feedback = '';
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // Remove previous classes
    strengthBar.className = 'strength-fill';
    
    switch (strength) {
        case 0:
        case 1:
            strengthBar.classList.add('strength-weak');
            feedback = 'Password debole';
            break;
        case 2:
            strengthBar.classList.add('strength-fair');
            feedback = 'Password discreta';
            break;
        case 3:
        case 4:
            strengthBar.classList.add('strength-good');
            feedback = 'Password buona';
            break;
        case 5:
            strengthBar.classList.add('strength-strong');
            feedback = 'Password forte';
            break;
    }
    
    strengthText.textContent = feedback;
    return strength;
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let feedback = '';
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // Remove previous classes
    strengthBar.className = 'strength-fill';
    
    switch (strength) {
        case 0:
        case 1:
            strengthBar.classList.add('strength-weak');
            feedback = 'Password debole';
            break;
        case 2:
            strengthBar.classList.add('strength-fair');
            feedback = 'Password discreta';
            break;
        case 3:
        case 4:
            strengthBar.classList.add('strength-good');
            feedback = 'Password buona';
            break;
        case 5:
            strengthBar.classList.add('strength-strong');
            feedback = 'Password forte';
            break;
    }
    
    strengthText.textContent = feedback;
    return strength;
}

function validateName(name) {
    const nameRegex = /^[A-Za-zÀ-ÿ\s'-]+$/;
    return nameRegex.test(name);
}

// Form validation
function validateForm() {
    const firstName = document.getElementById('name').value;
    const lastName = document.getElementById('surname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const registerBtn = document.getElementById('reg-form');
    
    let isValid = true;
    
    // Check if names are valid
    if (firstName && !validateName(firstName)) {
        document.getElementById('firstNameError').textContent = 'Nome non valido';
        document.getElementById('firstNameError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('firstNameError').style.display = 'none';
    }
    
    if (lastName && !validateName(lastName)) {
        document.getElementById('lastNameError').textContent = 'Cognome non valido';
        document.getElementById('lastNameError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('lastNameError').style.display = 'none';
    }
    
    // Enable/disable register button
    if (firstName && lastName && email && password && confirmPassword && 
        password === confirmPassword && validateName(firstName) && validateName(lastName)) {
        registerBtn.disabled = false;
    } else {
        registerBtn.disabled = true;
    }
}

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Add real-time validation for name and surname
document.getElementById('name').addEventListener('input', function() {
    const name = this.value;
    const errorEl = document.getElementById('firstNameError');
    
    if (name && !validateName(name)) {
        errorEl.textContent = 'Nome non valido';
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }
    validateForm();
});

document.getElementById('surname').addEventListener('input', function() {
    const surname = this.value;
    const errorEl = document.getElementById('lastNameError');
    
    if (surname && !validateName(surname)) {
        errorEl.textContent = 'Cognome non valido';
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }
    validateForm();
});

document.getElementById('email').addEventListener('blur', function() {
    const email = this.value;
    const errorEl = document.getElementById('emailError');
    const successEl = document.getElementById('emailSuccess');
    
    if (email && !validateEmail(email)) {
        errorEl.textContent = 'Email non valida';
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
    } else if (email && validateEmail(email)) {
        errorEl.style.display = 'none';
        successEl.textContent = 'Email valida';
        successEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
    }
    validateForm();
});

document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    checkPasswordStrength(password);
    validateForm();
});

document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const errorEl = document.getElementById('confirmPasswordError');
    const successEl = document.getElementById('confirmPasswordSuccess');
    
    if (confirmPassword && password !== confirmPassword) {
        errorEl.textContent = 'Le password non coincidono';
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
    } else if (confirmPassword && password === confirmPassword) {
        errorEl.style.display = 'none';
        successEl.textContent = 'Password confermata';
        successEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
    }
    validateForm();
});

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

// Enhanced hover effects
document.querySelectorAll('.register-button, .terms-link, .login-button-link').forEach(element => {
    element.addEventListener('mouseenter', function() {
        if (!this.disabled) {
            this.style.transform = 'translateY(-1px)';
        }
    });
    
    element.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Initialize
validateForm();

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

function addEntryAnimations() {
    // Header animations
    const header = document.querySelector('.register-header');
    header.style.opacity = '0';
    header.style.transform = 'translateY(-20px)';
    
    // Form elements animations
    const formElements = document.querySelectorAll('.input-group, .registerButton, .login-link');
    formElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-20px)';
    });
    
    // Trigger animations after a short delay
    setTimeout(() => {
        header.style.opacity = '1';
        header.style.transform = 'translateY(0)';
        
        formElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            }, 100 * (index + 1));
        });
    }, 100);
}

// Enhanced input animations
function enhanceInputAnimations() {
    document.querySelectorAll('.input-field').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02) translateY(-2px)';
            this.parentElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1) translateY(0)';
        });
    });
}

// Add smooth transitions for validation messages
function enhanceValidationMessages() {
    const messages = document.querySelectorAll('.error-message, .success-message');
    messages.forEach(message => {
        message.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });
}

// Inizializza quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Imposta il tema iniziale basato sulle preferenze di sistema
    setSystemTheme();
    addEntryAnimations();
    enhanceInputAnimations();
    enhanceValidationMessages();
    
    // Mantieni la funzionalità del toggle manuale
    document.getElementById('toggleSwitch').addEventListener('click', function() {
        const root = document.documentElement;
        const isDark = root.getAttribute('data-theme') === 'light';
        setTheme(isDark);
    });
});

const overlay = document.getElementById('overlay');
const dialog = document.querySelector('.confirm-dialog');
const dialogTitle = document.querySelector('.confirm-dialog-title');
const dialogDescription = document.querySelector('.confirm-dialog-description');
const btnYes = document.querySelector('.confirm-btn.yes');
const btnNo = document.querySelector('.confirm-btn.no');  
const btnOk = document.querySelector('.confirm-btn.ok');

function generateDialogReg(type, title, description, yesCallback) {
    // type: "confirm" (Ha i bottoni "Si", "No"), "info" e "error" e "success" (Ha il bottone "OK")
    overlay.style.display = 'flex';
    dialogTitle.innerText = title;
    dialogDescription.innerText = description;

    if (type === "confirm") {
        btnYes.style.display = 'inline-block';
        btnNo.style.display = 'inline-block';
        btnOk.style.display = 'none';

        // Cambia il colore del pulsante "Sì" in base al titolo
        if (title.includes("attivazione")) {
            btnYes.classList.add('btn-green'); // Aggiungi classe per il verde
            btnYes.classList.remove('btn-red'); // Rimuovi eventuale classe rossa
        } else {
            btnYes.classList.add('btn-red'); // Usa il rosso per altri casi
            btnYes.classList.remove('btn-green'); // Rimuovi eventuale classe verde
        }
    } else if (type === "info" || type === "error" || type === "success") {
        btnYes.style.display = 'none';
        btnNo.style.display = 'none';
        btnOk.style.display = 'inline-block';

        // Aggiungi l'evento per il pulsante "OK"
        btnOk.onclick = () => {
            overlay.style.display = 'none';
            if (yesCallback) yesCallback(); // Esegui il callback se esiste
        };
    }

    const buttons = dialog.querySelectorAll('.confirm-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            overlay.classList.add('fadeOut');
            setTimeout(async () => {
                if (button.classList.contains('yes')) {
                    yesCallback();
                }
                overlay.classList.remove('fadeOut');
                overlay.style.display = 'none';
            }, 200);
        });
    });
}