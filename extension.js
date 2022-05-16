
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//const { once } = require('events');
const vscode = require('vscode');
const net = require('net');
const { write } = require('fs');
const { privateEncrypt } = require('crypto');
const EmotionAwareIDE = require('./emotionawareide.js');

let emoide =  new EmotionAwareIDE();

const GIT_HOOK_SCRIPT = "#!/bin/sh\nFILE=$1\nMESSAGE=$(cat $1)\nlines=`wc -l .git/logs/HEAD | awk '{print $1;}'`\nAUTHOR=`git config user.name`\nTIMESTAMP=`git log --author=\"$AUTHOR\" -1 --format=%ct`\nINPUT=\"emotions.csv.tmp\"\ncurl -o $INPUT \"127.0.0.1:8050/assets/emotions.csv\" 2>/dev/null\nLOCATION=`curl \"127.0.0.1:8050/assets/location\" 2>/dev/null`\n\ndate +%s > \"$LOCATION/time\"\nTMP=(0 0 0 0)\nwhile IFS=\",\" read -r TIME EMOT\ndo\nTMP1=${EMOT%.*}\nTMP2=${TIME%.*}\nif [ \"$TMP1\" != \"emotions\" ]\nthen\nif [ $TMP2 -gt $TIMESTAMP ]\nthen\n((TMP[(($TMP1-1))]++))\nfi\nfi\ndone < $INPUT\nBIG=${TMP[0]}\nINDEX=0\nSUM=0\nfor i in {0..3}\ndo\nSUM=$((TMP[$i]+$SUM))\nif [ ${TMP[$i]} -gt $BIG ]\nthen\nBIG=${TMP[$i]}\nINDEX=$i\nfi\ndone\nrm $INPUT\nEMOTION=\" \"\nif [ $INDEX = 0 ]\nthen\nEMOTION=\"😰\"\nfi\nif [ $INDEX = 1 ]\nthen\nEMOTION=\"😃\"\nfi\nif [ $INDEX = 2 ]\nthen\nEMOTION=\"😞\"\nfi\nif [ $INDEX = 3 ]\nthen\nEMOTION=\"😐\"\nfi\nCERT=$((100 * $BIG/$SUM))\necho \"$MESSAGE\n\n$EMOTION $CERT%\" > $FILE"

let statusbar_item;
let e4_statusbar;
let eye_statusbar;

let server_connected = false;
let e4_connected = false;
let eye_connected = false;
let baseline = false;

const SUCCESS_STR = "SUCC"
const FAIL_STR = "FAIL"




function displayMessage(message) {
	// displays message as popup
	vscode.window.showInformationMessage(message);
}


async function addGitHook() {
	if (vscode.workspace.workspaceFolders == undefined) {
		return;
	}
	let rootFolder = vscode.workspace.workspaceFolders[0].uri;
	let gitfolder = vscode.Uri.joinPath(rootFolder, ".git");
	try {
		let res = await vscode.workspace.fs.readDirectory(gitfolder);
		let githook = vscode.Uri.joinPath(gitfolder, "hooks/commit-msg");
		try {
			res = await vscode.workspace.fs.stat(githook);
		} catch(e) {
			let answer = await vscode.window.showInformationMessage("It seems this is a git project, would you like to add the git hook?", "Yes", "No");
			if (answer == "Yes") {
				await vscode.workspace.fs.writeFile(githook, Buffer.from(GIT_HOOK_SCRIPT), {create: true, overwrite: false});
			}
		}
	} catch(e) {}
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	
	addGitHook();

	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('emotionawareide.start_dashboard', show_web_view);

	// pushes command to context
	context.subscriptions.push(disposable);

	let client = null;
	async function connect_to_server() {
		return new Promise((res, rej)=> {
			if (!server_connected) {
				client = new net.Socket();
				const server_port = vscode.workspace.getConfiguration('emotionawareide').get('server.port');
				client.connect(server_port, '127.0.0.1', () => {
					if (!server_connected) {
						server_connected = true;
						console.log('Connected');
						emoide.actionSetup();
						client.write(to_msg("SBL"));
						res();
					}
				});
				client.on('data', (data) => {
					messages = data.toString().split('\r\n');
					for (const message of messages) {
						if (message !== "") {
							emoide.handleData(message);
						}
					}
				});
				client.on("error", (err) =>{
					rej();
					// displayMessage("Could not connect to server, check port and try again.");
					});
		  	} else {
			  res();
		  	}
		});		// on data received run function
	}

	connect_to_server().then(()=>{},()=>{console.log("Initial connection failed.");});

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

	function connect_server_e4() {
		connect_to_server().then(
			()=>{connect_e4();}, 
			()=>{
				e4_statusbar.text = "$(watch)E4";
				displayMessage("Could not connect to Python Server, check port and try again.");
			});
	}

	function connect_server_eye() {
		connect_to_server().then(
			()=>{
				connect_eyetracker();
				displayMessage("This might take a while 👀");
			}, 
			()=>{
				eye_statusbar.text = "$(eye)EYE";
				displayMessage("Could not connect to Python Server, check port and try again.");
			});
	}

	function connect_e4 (){
		if (server_connected){
			const e4_port = vscode.workspace.getConfiguration('emotionawareide').get('e4.port');
			client.write(to_msg(`CE4 ${e4_port.toString()}`));
		} else {
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

	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_server', connect_to_server));
	// connect_to_server();

	function to_msg(msg) {
		return msg +"\r\n";
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
		complete_msg = "ACT SRVY " + result;
		client.write(to_msg(complete_msg));
	});

	emoide.addActionCommand("ESTM", async (message) => {
		let data_arr = message.split(" ");
		let pred_index = parseInt(data_arr[0]);
		let pred_certainty = data_arr[1];
		update_statusbar_label(emotion_to_emoji(pred_index));
	});

	emoide.addActionCommand("BRK", async (message) => {
		displayMessage("You might need to take a break ☕");
	});

	emoide.addActionCommand("CSTM", (message) => {
		displayMessage("There is a problem with the E4 server, try restarting the E4 streaming App.");
	});

	emoide.addServerCommand("ERR", (message) => {
		displayMessage(message);
	});

	emoide.addServerCommand("CE4", (message) => {
		e4_statusbar.text = "$(watch)E4";
		if (message == SUCCESS_STR) {
			e4_connected = true;
			e4_statusbar.color = "#42f551";
			if (baseline) {
				emoide.activateActions();
			}
			else {
				let r_promise = vscode.window.showInformationMessage("Baseline needed for data streaming.", "Record!", "Later");
				r_promise.then((result) => {
					if (result == "Record!"){
						displayMessage("Act natural. 😐");
						client.write(to_msg("SBL NEW"));
					}
				});
			}
			return;
		}
		let parts = message.split(' ');
		e4_connected = false;
		e4_statusbar.color = undefined;
		if (parts[1] == "SERVER") {
			const port = vscode.workspace.getConfiguration("emotionawareide").get("e4.port");
			displayMessage(`Could not connect to E4 Streaming Server on port ${port}.`);
		} else {
			displayMessage("Could not find any E4 device.");
		}
	});

	emoide.addServerCommand("DE4", (message) => {
		e4_connected = false;
		e4_statusbar.text = "$(watch)E4";
		e4_statusbar.color = undefined;
		let parts = message.split(' ');
		if (parts[1] == "LOST") {
			displayMessage("Lost connection to E4.");
		}
	});

	emoide.addServerCommand("SBL", (message) => {
		let parts = message.split(' ');
		if (parts[0] == "SUCC") {
			if (parts[1] == "NEW") {
				displayMessage("Baseline set, ready for development.");
			}
			baseline = true;
			if (e4_connected)
				emoide.activateActions();
			return;
		}
		if (parts[0] == "FAIL" && parts[1] == "NEW") {
			displayMessage("Could not record a baseline, try again.");
		} else if (parts[0] == "FAIL" && parts[1] == "CE4") {
			displayMessage("Baseline not recorded, E4 not connected");
		}
	});

	emoide.addServerCommand("ONEY", (message) => {
		eye_statusbar.text = "$(eye)EYE";
		if (message == FAIL_STR) {
			eye_connected = false;
			eye_statusbar.color = undefined;
			const port = vscode.workspace.getConfiguration("emotionawareide").get("eye.port");
			displayMessage(`Could not connect to Eye tracker on port ${port}.`);
		} else {
			eye_connected = true;
			eye_statusbar.color = "#42f551";
			emoide.activateActions();
		}
	});

	emoide.addServerCommand("OFEY", (message) => {
		eye_statusbar.text = "$(eye)EYE";
		eye_connected = false;
		eye_statusbar.color = undefined;
		displayMessage("Eyetracker disconnected.");
	});
  
	// context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.start_survey', start_survey));


	vscode.commands.registerCommand("show_web_view", show_web_view);
	statusbar_item = vscode.window.createStatusBarItem(1, 1);
	statusbar_item.command = "show_web_view";
	statusbar_item.text = "😐";
	statusbar_item.show();


	function e4_connection () {
		if (e4_connected == false) {
			e4_statusbar.text = "$(sync~spin)E4"
			connect_server_e4();
		} else {
			let r_promise = vscode.window.showInformationMessage("What would you like to do?","New Baseline","Disconnect");
			r_promise.then((result) => {
				if (result == "Disconnect") {
					disconnect_e4();
				} else if (result == "New Baseline") {
					displayMessage("Act natural. 😐");
					client.write(to_msg("SBL NEW"));
				}
			});
		}
	}
	vscode.commands.registerCommand("e4_connection", e4_connection);
	e4_statusbar = vscode.window.createStatusBarItem(1,1);
	e4_statusbar.command = "e4_connection";
	e4_statusbar.tooltip = "Connect E4";
	e4_statusbar.text = "$(watch)E4";
	e4_statusbar.show();

	function eye_connection (){
		if (eye_connected == false) {
			eye_statusbar.text = "$(sync~spin)EYE";
			connect_server_eye();
		} else {
			let r_promise = vscode.window.showInformationMessage("What would you like to do?","Recalibrate","Disconnect");
			r_promise.then((result) => {
				if (result == "Disconnect") {
					disconnect_eyetracker();
				} else if (result == "Recalibrate") {
					client.write(to_msg("RCEY"));
				}
			});
		}
	}
	vscode.commands.registerCommand("eye_connection", eye_connection);
	eye_statusbar = vscode.window.createStatusBarItem(1,1);
	eye_statusbar.command = "eye_connection";
	eye_statusbar.text = "$(eye)EYE";
	eye_statusbar.tooltip = "Connect Eye Tracker";
	eye_statusbar.show();

	/*
		-------------------------------------------------
		  Events which triggers upon change in settings
		-------------------------------------------------
		 If an action the server name for the action is 
		          required after the function 
	*/


	emoide.addActivationEvent("action.survey.activate", (active) => {
		if (!server_connected)
			return;

		let server_msg = "DACT SRVY";
		if (active){
			server_msg = "AACT SRVY";
		}
		client.write(to_msg(server_msg));
	});

	emoide.addEditEvent("action.survey.time", (time) => {		
		if (!server_connected) {
			return;
		}

		let time_seconds = time*60;
		let server_msg = `EACT SRVY TIME ${time_seconds}`;
		client.write(to_msg(server_msg));
	});

	emoide.addActivationEvent("action.takeBreak.activate", (active) => {
		if (!server_connected)
			return;
		
		let server_msg = "DACT BRK";
		if (active){
			server_msg = "AACT BRK";
		}
		client.write(to_msg(server_msg));
	});

	emoide.addEditEvent("action.takeBreak.time", (time) => {
		if (!server_connected)
			return;
		
		let time_seconds = time*60;
		let server_msg = `EACT BRK TIME ${time_seconds}`;
		client.write(to_msg(server_msg))
	});

	emoide.addEditEvent("action.takeBreak.mood", (emoji)=>{
		if (!server_connected)
			return;
		
		const emotion = emoji_to_emotion(emoji);
		let server_msg = `EACT BRK EMO ${emotion}`;
		client.write(to_msg(server_msg))
	});

	emoide.addEditEvent("action.takeBreak.certainty", (percent) => {
		if (!server_connected)
			return;
		
		let decimal_form = percent / 100;
		let server_msg = `EACT BRK CERT ${decimal_form}`;
		client.write(to_msg(server_msg));
	})

	emoide.addActivationEvent("action.stuck.activate", (active) => {
		if (!server_connected)
			return;
		
		let server_msg = "DACT STUCK";
		if (active){
			server_msg = "AACT STUCK";
		}
		client.write(to_msg(server_msg));
	});

	emoide.addEditEvent("action.stuck.time", (time) => {
		if (!server_connected)
			return;
		let server_msg = `EACT STUCK TIME ${time}`;
		client.write(to_msg(server_msg));
	});


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
