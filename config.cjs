const fs = require('fs');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

const configFile = fs.readFileSync('configs.json');
const configData = JSON.parse(configFile);

let coicheString = "Please select a server:\n";
for (let i in configData) {
  coicheString = coicheString.concat(`[${i}]: ${configData[i].name}\n`);
}
coicheString = coicheString.concat(`Your Choice: `);

function selectConfig() { // Rimuovi async da qui, la Promise lo gestirà
  return new Promise((resolve, reject) => {
    readline.question(coicheString, choice => {
      const selectedIndex = parseInt(choice);
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= configData.length) {
        console.log(`Input not valid, insert a number between 0 and ${configData.length - 1}. Try again :)`);
        // Chiamata ricorsiva, la Promise esterna attenderà questa nuova Promise
        selectConfig().then(resolve).catch(reject);
      } else {
        console.log(`Ok, we'll use '${configData[selectedIndex].name}' as server!`);
        readline.close();
        resolve(configData[selectedIndex]); 
      }
    });
  });
}

module.exports = {
  selectConfig
};