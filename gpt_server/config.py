##############################################################################
# Script per scegliere la configurazione da usare per avviare il server,     #
# dev'essere la stessa di quella usata per avviare il server node.js che     #
# gestisce il frontend                                                       #
##############################################################################
import json
import os

def get_server_choice():
    parent_dir = os.path.dirname(os.path.dirname(__file__))

    with open(f'{parent_dir}/configs.json', 'r') as file:
        data = json.load(file)

    coiche_string = "Python GPT - Please select a server:\n"
    for i, server in enumerate(data):
        coiche_string += f"{i}: {server['name']}\n"

    while True:
        try:
            choice = int(input(f"{coiche_string}Your choice: "))
            if 0 <= choice < len(data):
                return data[choice]
                break
            else:
                print("Invalid choice. Please try again.\n")
        except ValueError:
            print("Invalid input. Please enter a number.\n")

