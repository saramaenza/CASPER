const _name = document.querySelector('#name');
const surname = document.querySelector('#surname');
const email = document.querySelector('#email');
const password = document.querySelector('#password');


window.addEventListener('load', () => { 
    getUserInfo();
})

async function getUserInfo(){
    const response = await fetch('/casper/userInfo');
    const data = await response.json();
    return printUserInfo(data);
}

function printUserInfo(data){
    _name.innerText = data.name;
    surname.innerText = data.surname || 'Not set';
    email.innerText = data.email;

    if(data.isGoogleAccount){
        password.innerText = "Your Google password"
    }else{
        password.innerText = "********"
    }
}


logoutButton = document.querySelector('#logout');
logoutButton.addEventListener('click', ()=>{
  Cookies.remove('auth-token');
  location.reload();
})