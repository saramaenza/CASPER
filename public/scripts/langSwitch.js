let it;
let en;
window.addEventListener('load', async ()=>{
    it = await (await fetch('../languages/it.json')).json();
    en = await (await fetch('../languages/en.json')).json();
    if (Cookies.get("lang") != undefined){
        document.querySelector(`#${Cookies.get('lang')}`).click();
    }else{
        Cookies.set("lang", "it");
    }
})

const lang = document.querySelectorAll('.flag');

lang.forEach(function(el) {
    el.addEventListener('click', event =>{
        if(!el.classList.contains('flag-selected')){
            document.querySelector('.flag-selected').classList.remove('flag-selected');
            el.classList.add('flag-selected');
            Cookies.set('lang', `${el.getAttribute('lang')}`);
            changeLanguage(el.getAttribute('lang'));
        }
    });
 });

 function changeLanguage(language){ //cambia la lingua di tutti gli elementi HTML
    const langModel = eval(language);
    Object.keys(langModel['homepage']).forEach(el => { //el = etichetta. es. "user-label"
        //console.log(document.querySelector(`#${el}`))
        let htmlEl = document.querySelector(`#${el}`)
        console.log(el)
        console.log(htmlEl)
        if(htmlEl.hasAttribute('value')){
            htmlEl.setAttribute('value', langModel['homepage'][el]);
        } 
        else htmlEl.innerHTML = langModel['homepage'][el];
    });
    Object.keys(langModel['personalpage']).forEach(el => { //el = etichetta. es. "user-label"
        //console.log(document.querySelector(`#${el}`))
        let htmlEl = document.querySelector(`#${el}`)
        if(htmlEl.hasAttribute('value')){
            htmlEl.setAttribute('value', langModel['personalpage'][el]);
        } 
        else htmlEl.innerHTML = langModel['personalpage'][el];
    })
   /* console.log('lang selected -> '+language);
   console.log(JSON.stringify(eval(language))) */

 }