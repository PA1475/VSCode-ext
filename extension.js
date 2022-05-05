
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//const { once } = require('events');
const vscode = require('vscode');
const net = require('net');
const { write } = require('fs');
const { privateEncrypt } = require('crypto');
const EmotionAwareIDE = require('./emotionawareide.js');

let emoide =  new EmotionAwareIDE();

let statusbar_item;
let e4_statusbar;
let eye_statusbar;

let server_connected = false;
let e4_connected = false;
let eye_connected = false;
let baseline = false;

SUCCESS_STR = "SUCC"
FAIL_STR = "FAIL"




function displayMessage(message) {
	// displays message as popup
	vscode.window.showInformationMessage(message);
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "emotionawareide" is now active!');

	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('emotionawareide.start_dashboard', show_web_view);

	// pushes command to context
	context.subscriptions.push(disposable);

	var client = new net.Socket();
	client.on("error", (err) =>{
		displayMessage("Could not connect to server, check port and try again.")
	});
	client.on('data', (data) => {
		let message = data.toString();
		emoide.handleData(message);
	});

	// pushes command to context
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.show_message', async () => {

		// gets message from user input
		if (server_connected)
		{
			// runs displaymessage with message
			// displayMessage(message);
			let message = await vscode.window.showInputBox({
				placeHolder: "Write a message"
			});
			client.write(to_msg(message));
		}

	}));

	function connect_eyetracker(){
		if (server_connected){
			const eyetracker_port = vscode.workspace.getConfiguration('emotionawareide').get('eye.port');
			client.write(to_msg(`ONEY ${eyetracker_port.toString()}`));
		} else 
		{
			displayMessage("Server needs to be connected first.")
			eye_statusbar.text = "$(eye)EYE";
		}
	}

	function disconnect_eyetracker(){
		if (server_connected && eye_connected){
			client.write(to_msg("OFEY"));
		}
	}

	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_eyetracker', connect_eyetracker));
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.test_communication', async () => {
		let message = await vscode.window.showInputBox({
			placeHolder: "Write a message"
		});
		emoide.handleData(message);
	}))

	function connect_e4 (){
		if (server_connected){
			const e4_port = vscode.workspace.getConfiguration('emotionawareide').get('e4.port');
			client.write(to_msg(`CE4 ${e4_port.toString()}`));
		} else {
			displayMessage("Server needs to be connected first.");
			e4_statusbar.text = "$(watch)E4";
		}
	}

	function disconnect_e4 (){
		if (server_connected && e4_connected)
		{
			client.write(to_msg("DE4"));
		}
	}
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_e4', connect_e4));

	function connect_to_server() {
		if (!server_connected) {
			const server_port = vscode.workspace.getConfiguration('emotionawareide').get('server.port');
			let could_connect = false;
			client.connect(server_port, '127.0.0.1', () => {
				console.log('Connected');
				could_connect = true;
				server_connected = true;
				console.log(could_connect);
				client.write(to_msg("SBL"));
			});
			// on data received run function
		}
	}
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_server', connect_to_server));
	connect_to_server();

	function to_msg(msg) {
		return msg +"\t\n";
	}

	// cmd

	function emotion_to_emoji(index)
	{
		let emoji = "";
		switch(index)
		{
			case 1:
				emoji = "😰";
				break;
			case 2:
				emoji = "😃";
				break;
			case 3:
				emoji = "😞";
				break;
			case 4:
				emoji = "😐";
				break;
		}
		return emoji;
	}

	emoide.addActionCommand("TEST", async (message) => {
		let response = await vscode.window.showInputBox({
			placeHolder : "Write response to TEST"
		});
		complete_resp = "ACT TEST " + response;
		displayMessage(complete_resp);
		client.write(to_msg(complete_resp));
	});

	emoide.addActionCommand("SRVY", async (message) => {
		let result = await show_survey();
		console.log(result);
		complete_msg = "ACT SRVY " + result;
		client.write(to_msg(complete_msg));
	});

	emoide.addActionCommand("ESTM", async (message) => {
		let data_arr = message.split(" ");
		let pred_index = parseInt(data_arr[0]);
		let pred_certainty = data_arr[1];
		complete_msg = `I believe you are: ${emotion_to_emoji(pred_index)}, with ${pred_certainty}% certainty.`;
		update_statusbar_label(emotion_to_emoji(pred_index));
		displayMessage(complete_msg);
	});

	emoide.addServerCommand("ERR", (message) => {
		displayMessage(message);
	})

	emoide.addServerCommand("CE4", (message) => {
		e4_statusbar.text = "$(watch)E4";
		if (message == FAIL_STR) {
			e4_connected = false;
			e4_statusbar.color = undefined;
			displayMessage(
				"Could not connect to E4, check the E4 "+
				"manager app and port.")
		} else {
			e4_connected = true;
			e4_statusbar.color = "#42f551";
			client.write(to_msg(`AACT ${emoide.activeActions}`));
		}
	});

	emoide.addServerCommand("DE4", (message) => {
		e4_connected = false;
		e4_statusbar.text = "$(watch)E4";
		e4_statusbar.color = undefined;
		displayMessage("E4 disconnected.");
	});

	emoide.addServerCommand("SBL", (message) => {
		if (message == "SUCC"){
			displayMessage("Baseline set, ready for development.");
		}
		else {
			displayMessage("New Baseline needs to be created.")
		}
	});

	emoide.addServerCommand("ONEY", (message) => {
		eye_statusbar.text = "$(eye)EYE";
		if (message == FAIL_STR) {
			eye_connected = false;
			eye_statusbar.color = undefined;
			displayMessage(
				"Could not connect to Eyetracker. Make sure "+
				"GazePoint control is active or the port in "+
				"settings corresponds to the correct port.");
		} else {
			eye_connected = true;
			eye_statusbar.color = "#42f551";
			client.write(to_msg(`AACT ${emoide.activeActions}`));	
		}
	});

	emoide.addServerCommand("OFEY", (message) => {
		eye_statusbar.text = "$(eye)EYE";
		eye_connected = false;
		eye_statusbar.color = undefined;
		displayMessage("Eyetracker disconnected.");
	});
  
	// context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.start_survey', start_survey));

	/*

		Status bar items

	*/

	vscode.commands.registerCommand("show_web_view", show_web_view);
	statusbar_item = vscode.window.createStatusBarItem(1, 1);
	statusbar_item.command = "show_web_view";
	statusbar_item.show();


	function e4_connection () {
		console.log(e4_connected);
		if (e4_connected == false) {
			e4_statusbar.text = "$(watch)$(sync~spin)"
			connect_e4();
		} else {
			disconnect_e4();
		}
	}
	vscode.commands.registerCommand("e4_connection", e4_connection);
	e4_statusbar = vscode.window.createStatusBarItem(1,1);
	e4_statusbar.command = "e4_connection";
	e4_statusbar.text = "$(watch)E4";
	e4_statusbar.show();

	function eye_connection (){
		if (eye_connected == false) {
			eye_statusbar.text = "$(eye)$(sync~spin)";
			connect_eyetracker();
		} else {
			disconnect_eyetracker();
		}
	}
	vscode.commands.registerCommand("eye_connection", eye_connection);
	eye_statusbar = vscode.window.createStatusBarItem(1,1);
	eye_statusbar.command = "eye_connection";
	eye_statusbar.text = "$(eye)EYE";
	eye_statusbar.show();

	/*
		-------------------------------------------------
		  Events which triggers upon change in settings
		-------------------------------------------------
		 If an action the server name for the action is 
		          required after the function 
	*/

	emoide.addSettingEvent("server.port", (port) => {
		console.log(`Connecting to ${port}`);
	});

	emoide.addSettingEvent("e4.port", (port) => {
		if (server_connected)
			e4_connection();
	});

	emoide.addSettingEvent("eye.port", (port) => {
		if (server_connected)
			eye_connection();
	});

	emoide.addSettingEvent("action.survey", (active) => {
		if (!server_connected)
			return;

		let server_msg = "DACT SRVY";
		if (active){
			server_msg = "AACT SRVY";
		}
		client.write(to_msg(server_msg));
	}, "SRVY");

	emoide.addSettingEvent("action.estimate", (active) => {
		if (!server_connected)
			return;
		
		let server_msg = "DACT ESTM";
		if (active){
			server_msg = "AACT ESTM";
		}
		client.write(to_msg(server_msg));
	}, "ESTM");

	emoide.addSettingEvent("action.takeBreak.activate", (active) => {
		if (!server_connected)
			return;
		
		let server_msg = "DACT BRK";
		if (active){
			server_msg = "AACT BRK";
		}
		client.write(to_msg(server_msg));
	}, "BRK");

	emoide.addSettingEvent("action.takeBreak.time", (time) => {
		if (!server_connected)
			return;
		
		let time_seconds = time*60;
		let server_msg = `EACT BRK TIME ${time_seconds}`;
		client.write(to_msg(server_msg))
	});

	emoide.addSettingEvent("action.takeBreak.mood", (emoji)=>{
		if (!server_connected)
			return;
		
		const emotion = emoji_to_emotion(emoji);
		let server_msg = `EACT BRK EMO ${emotion}`;
		client.write(to_msg(server_msg))
	});

	emoide.addSettingEvent("action.takeBreak.certainty", (percent) => {
		if (!server_connected)
			return;
		
		let server_msg = `EACT BRK CERT ${percent}`;
		client.write(to_msg(server_msg));
	})

	emoide.addSettingEvent("action.stuck", (active) => {
		if (!server_connected)
			return;
		
		let server_msg = "DACT STUCK";
		if (active){
			server_msg = "AACT STUCK";
		}
		client.write(to_msg(server_msg));
	}, "STUCK");


	vscode.workspace.onDidChangeConfiguration((e) => {
		emoide.onSettingChange(e);
	});

}


function update_statusbar_label(_label) {
	statusbar_item.text = _label;
}


function show_web_view() {
	// creates a webview
	const panel = vscode.window.createWebviewPanel(
		"dashboard",
		"Dashboard",
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	);

	// gets the html to display
	panel.webview.html = getWebviewContent();
}

function emoji_to_emotion(emoji)
{
	let emotion = 0;
	switch(emoji)
	{
		case "😰":
			emotion = 1;
			break;
		case "😃":
			emotion = 2;
			break;
		case "😞":
			emotion = 3;
			break;
		case "😐":
			emotion = 4;
			break;
	}
	return emotion;
}

async function show_survey() {
	res_mood = await vscode.window.showInformationMessage("How are you feeling?", "😰", "😞", "😐", "😃");
	let result = emoji_to_emotion(res_mood);
	return result;
}



function getWebviewContent() {
	// returns html as a iframe
	return `<!DOCTYPE html>
	<html>
	  
	<head>
		<title>full screen iframe</title>
		<style type="text/css">
			html {
				overflow: auto;
			}
			  
			html,
			body,
			div,
			iframe {
				margin: 0px;
				padding: 0px;
				height: 100%;
				border: none;
			}
			  
			iframe {
				display: block;
				width: 100%;
				border: none;
				overflow-y: auto;
				overflow-x: hidden;
			}
		</style>
	</head>
	  
	<body>
		<iframe src="http://localhost:8050"
				frameborder="0" 
				marginheight="0" 
				marginwidth="0" 
				width="100%" 
				height="100%" 
				scrolling="auto">
	  </iframe>
	  
	</body>
	  
	</html>`;
}

// this method is called when your extension is deactivated
function deactivate() {
	console.log("Shutting down")
	let END_STREAM = "END END_SERVER";
	client.write(to_msg(END_STREAM));
	client.close();

}

module.exports = {
activate,
deactivate
}
