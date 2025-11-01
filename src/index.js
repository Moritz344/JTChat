#!/usr/bin/env node
import blessed from 'blessed';
import { Command } from 'commander';
import chalk from 'chalk';
import tmi from 'tmi.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const envPath = path.join(__dirname, '.env');
dotenv.config({path: envPath});

const program = new Command();

const loadConfig = () => {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
};

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf-8"),
);

const config = loadConfig();
const randomStreamerList = config.streamer.names;
const randomStreamer = randomStreamerList[Math.floor(Math.random() * randomStreamerList.length)];

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
		 screen.key(['q', 'C-c'], () => process.exit(0));
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


}


function main() {
  program
    .name('JTChat')
    .description('Twitch chat TUI')
    .version(pkg.version);
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
				console.log(chalk.red(`
To be able to read and write chat messages,
you have to setup a .env file with your ` + chalk.green(
`TWITCH_USERNAME=YOUR_USERNAME `) + `and ` + chalk.green(`TWITCH_TOKEN=YOUR_ACCESS_TOKEN.`)
				));
				console.log("");
				process.exit(0);
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



