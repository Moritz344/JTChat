const blessed = require('blessed');
const { Command } = require('commander');
const chalk = require('chalk').default;
const tmi = require('tmi.js');

require('dotenv').config();

const program = new Command();

const clientToken = process.env.TWITCH_PASSWORD;
const username = process.env.TWITCH_USERNAME;
var streamer = "vedal987"; 
let client;

function checkIfUserInfoExists() {
		if (username === undefined && clientToken === undefined) {
				console.log(chalk.red.bold("Please make an .env file with yout TWITCH_USERNAME and TWITCH_ACCESSTOKEN!"));
				process.exit(0);
		}
}

checkIfUserInfoExists();

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
		
		screen.key(['q', 'C-c'], () => process.exit(0));

}


function main() {
  program
    .name('Twitch-TUI')
    .description('Twitch chat TUI')
    .version("0");
  
  


  program.parse(process.argv);
}


main();

function initClient() {
		client = new tmi.Client({
        options: { debug: false },
        connection: { reconnect: true },
        identity: {
          username: username, 
          password: clientToken//https://twitchtokengenerator.com
        },
        channels: [ streamer ] 
      });

      client.connect().then(() => {
		chat.log(chalk.green.bold(`Switching Client `));
	  });

	  onChat(client);

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

		checkForKeyboard(client);

}



