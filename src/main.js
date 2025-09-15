const blessed = require('blessed');
const { Command } = require('commander');
const chalk = require('chalk').default;
const tmi = require('tmi.js');
const path = require('path');  
const fs = require('fs');

require('dotenv').config();

const program = new Command();

const configPath = path.resolve(__dirname, 'config.json');
const configData = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configData);

let randomStreamerList = config.streamer.names;
let randomStreamer = randomStreamerList[Math.floor(Math.random() * randomStreamerList.length)];

const clientToken = process.env.TWITCH_TOKEN;
const username = process.env.TWITCH_USERNAME;
var streamer = randomStreamer; 
let client;



var runClient = true;

function checkIfUserInfoExists() {
		if (username === undefined && clientToken === undefined) {
				console.log(chalk.red.bold("Please make an .env file with yout TWITCH_USERNAME and TWITCH_TOKEN!"));
				return false;
		} 
    return true;
}

let status = checkIfUserInfoExists();
if (!status) {
				process.exit(0);
}

var screen = blessed.screen({
  smartCSR: true,
  title: 'twitch-chat'
});

var chat = blessed.log({
  top: 'top',
  label: "Chat",
  left: '0',
  width: '100%',
  height: '93%',
  content: chalk.yellow.bold('Hello!'),
  mouse: true,
  scrollable: true,
  alwaysScroll: true,
  scrollback: 1000,
  vi: true,
  scrollbar: {
    ch: '|',
    inverse: true
  },
  border: {
    type: 'line',
    fg: 'cyan'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'cyan'
    }
  }
});

var inputBox = blessed.textbox({
  bottom: '0',
  left: '0',
  width: '100%',
  height: 'shrink',
  mouse: true,
  inputOnFocus:true,
  border: {
    type: "line",
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'cyan'
    }
  }
});


screen.append(chat);
screen.append(inputBox);
inputBox.focus();
screen.render();

function checkForKeyboard(client,) {
     inputBox.removeAllListeners('submit');

     if (!client && client.readyState() !== "OPEN") {
				chat.log("Client not ready");
				return;
		 }

     if (runClient  ) {
				inputBox.on('submit', (value) => {
		 		 	 let message = value.trim();

		 		 	 if (message == "exit") {
		 		 			 process.exit(0);
		 		 	 }else if(message.startsWith("/streamer")) {
		 		 			const parts = message.trim().split(' ');
		 		 			if (parts.length >= 1) {
		 		 					newStreamer(parts[1]);
		 		 					inputBox.clearValue();

		 		 			}
		 		 	 }else {
		 		 			client.say(streamer,message).then(() => {
		 		 					chat.log(`[#${streamer}] ${chalk.yellow.bold(username)}: ${message}`);
		 		 					inputBox.focus();
		 		 					inputBox.clearValue();
		 		 			}).catch(console.error);
		 		 	 }

				});

		 }else{
						 chat.log("");
						 chat.log(chalk.blue('Press "ESCAPE" and "q" to quit'));
		 }
		
		screen.key(['q', 'C-c'], () => process.exit(0));

}


function main() {
  program
    .name('Twitch-TUI')
    .description('Twitch chat TUI')
    .version("0");
  program
				.command('streamer')
				.argument('<streamername>','open the tui with the chat of an specific streamer')
				.description('the name of the streamer')
				.action((streamerName) => {
							streamer = streamerName
				});
  program
				.command('tui')
				.description('open the tui with a random streamer chat')
  program
				.command('setup')
				.description('setup')
				.action(() => {
				runClient = false;
				chat.log(chalk.red(`
To be able to read and write chat messages,
you have to setup a .env file with your ` + chalk.green(
`TWITCH_USERNAME=YOUR_USERNAME `) + `and ` + chalk.green(`TWITCH_TOKEN=YOUR_ACCESS_TOKEN.`) 
				));
				});

  program.parse(process.argv);
}


main();

function initClient() {
    if (runClient) {
				client = new tmi.Client({
    		    options: { debug: false},
    		    connection: { reconnect: true},
    		    identity: {
    		      username: username, 
    		      password: clientToken//https://twitchtokengenerator.com
    		    },
    		    channels: [ streamer ] 
    		  });

    		client.connect().then(() => {
						chat.log(chalk.green.bold(`Joined ${streamer} `));
	  		}).catch(err => {
						chat.log(chalk.red.bold(`Error Connecting to client! ${err}`));
				});

				client.on('connected', (addr, port) => {
								chat.log(chalk.green(`Connected to ${addr}:${port}`));
								checkForKeyboard(client);
				});


    		client.on('notice', (channel, msgid, message) => {
						chat.log(chalk.red(`Twitch Notice (${msgid}): ${message}`));
    		});
    		client.on('error', (err) => {
						chat.log(chalk.red.bold(`Error: ${err}`));
    		});




    		inputBox.clearValue();

	  		onChat(client);

		}

}

initClient();

function newStreamer(new_streamer ) {
		if (client) {
				client.disconnect().then(() => {
						streamer = new_streamer;
						chat.setContent('');
						chat.log(chalk.green.bold(`Switching Stream => ${streamer}`));
						initClient();
				}).catch(console.error);

		}else {
				initClient();
		}
}



function onChat() {
		client.on('message', (channel, tags, message, self) => {
				if (self) return; 
				const user = tags['display-name'] || tags.username;
				chat.log(`[#${streamer}] ${chalk.blue(user)}: ${message}`);
				screen.render();
		});


}



